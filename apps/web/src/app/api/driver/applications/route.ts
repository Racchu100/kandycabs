import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveDriverApplication } from '@/lib/userStore';
import { z } from 'zod';

const applicationSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().optional(),
  city: z.string().min(2),
  vehicleOwned: z.string().min(2),
  message: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = applicationSchema.parse(body);

    // Save in userStore in-memory registry
    const storedApp = saveDriverApplication({
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      city: input.city,
      vehicleOwned: input.vehicleOwned,
      message: input.message || null,
      status: 'PENDING',
    });

    let dbApp: any = null;
    try {
      dbApp = await prisma.driverApplication.create({
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          city: input.city,
          vehicleOwned: input.vehicleOwned,
          message: input.message || null,
          status: 'PENDING',
        },
      });
    } catch (dbErr) {
      console.warn('[driver/applications POST] Prisma DB write fallback:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Driver application submitted successfully!',
      applicationId: dbApp?.id || storedApp.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to submit driver application' },
      { status: 400 }
    );
  }
}

