import { NextResponse } from 'next/server';
import { REVIEWS } from '@/config/siteData';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: REVIEWS,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, rating, comment, author, location } = body;

    if (!bookingId || !rating || !comment) {
      return NextResponse.json({ error: 'bookingId, rating, and comment are required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      review: {
        id: `rev_${Date.now()}`,
        bookingId,
        author: author || 'Verified Rider',
        location: location || 'Mangaluru',
        rating,
        comment,
        date: 'Just now',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to post review' }, { status: 500 });
  }
}
