import React from 'react';
import { Card } from '@/components/ui/Card';
import { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <Card padded className="rev">
      <div className="stars" aria-label={`Rating: ${review.rating} out of 5 stars`}>
        {'★'.repeat(review.rating)}
      </div>
      <p>"{review.comment}"</p>
      <div className="rev-by">
        <div className="av">{review.author.charAt(0)}</div>
        <div>
          <b>{review.author}</b>
          <small>
            {review.location} · {review.date}
          </small>
        </div>
      </div>
    </Card>
  );
};
