import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getReviewsForCrop, createReview } from "../api";
import { Star } from "lucide-react";

interface Review {
  id?: number;
  rating: number;
  comment?: string;
  created_at?: string;
  user_name?: string;
}

const StarBar = ({ value }: { value: number }) => {
  const normalized = Math.max(0, Math.min(5, value));
  const filled = Math.round(normalized);

  return (
    <div className="flex items-center gap-1" aria-label={`${normalized.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
        />
      ))}
    </div>
  );
};

const RatingWidget: React.FC<{ cropId: number }> = ({ cropId }) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getReviewsForCrop(cropId);
      if (Array.isArray(data)) setReviews(data);
    } catch (e) {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [cropId]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await createReview(cropId, { rating, comment });
      if (!res.error) {
        setComment("");
        setRating(5);
        load();
      }
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">Rating:</div>
        <select value={String(rating)} onChange={e => setRating(Number(e.target.value))} className="border rounded px-2 py-1">
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Very good</option>
          <option value="3">3 - Good</option>
          <option value="2">2 - Fair</option>
          <option value="1">1 - Poor</option>
        </select>
      </div>
      <div>
        <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a short review (optional)" />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">Submit Review</Button>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Recent Reviews</div>
          {averageRating && (
            <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs">
              <StarBar value={Number(averageRating)} />
              <span>{averageRating} / 5</span>
            </div>
          )}
        </div>
        {loading && <div className="text-xs text-muted-foreground">Loading...</div>}
        {!loading && reviews.length === 0 && (
          <div className="text-xs text-muted-foreground">No reviews yet</div>
        )}
        <ul className="space-y-2 mt-2 text-sm">
          {reviews.map(r => (
            <li key={r.id} className="border rounded p-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.user_name || 'Anonymous'}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StarBar value={r.rating} />
                  <span>{r.rating} / 5</span>
                </div>
              </div>
              {r.comment && <div className="text-xs mt-1">{r.comment}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RatingWidget;
