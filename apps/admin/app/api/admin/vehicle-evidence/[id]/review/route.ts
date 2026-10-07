import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { DriverVerificationStatus } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id;
    const body = await req.json();
    const { status, adminNotes } = body;

    if (!status || !Object.values(DriverVerificationStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid verification status' },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    let finalNotes = driver.adminNotes;
    if (adminNotes !== undefined && adminNotes !== null && String(adminNotes).trim()) {
      // If admin provided a specific note (e.g., rejection feedback), preserve vehicle tags while updating note
      const carModelMatch = driver.adminNotes?.match(/\[Car Model:\s*([^\]]+)\]/);
      const carriageMatch = driver.adminNotes?.match(/\[Luggage\/Carriage:\s*([^\]]+)\]/);
      const tags = [carModelMatch ? carModelMatch[0] : '', carriageMatch ? carriageMatch[0] : ''].filter(Boolean).join(' ');
      finalNotes = tags ? `${adminNotes.trim()} ${tags}` : adminNotes.trim();
    }

    // Update Driver verification status
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        verificationStatus: status as DriverVerificationStatus,
        adminNotes: finalNotes,
      },
    });

    // Write Audit Log non-blockingly
    try {
      await prisma.auditLog.create({
        data: {
          action: status === 'APPROVED' ? 'DRIVER_KYC_APPROVED' : 'DRIVER_KYC_REJECTED',
          entityType: 'Driver',
          entityId: driverId,
          reason: adminNotes || `Driver KYC ${status.toLowerCase()} by admin`,
        },
      });
    } catch (auditErr) {
      console.warn('Failed to record audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Driver status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('Error reviewing driver KYC:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to review driver KYC' },
      { status: 500 }
    );
  }
}
