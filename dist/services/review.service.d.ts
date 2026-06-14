import type { Review, Issue } from "../generated/prisma/client.js";
type ReviewWithIssues = Review & {
    issues: Issue[];
};
declare class ReviewService {
    /**
     * The main review pipeline.
     *
     * 1. Fetch the review + repository from DB
     * 2. Get the user's access token
     * 3. Fetch the commit diff from GitHub
     * 4. Send the diff to Gemini AI for analysis
     * 5. Store the issues and update the review
     */
    processReview(reviewId: string): Promise<void>;
    /**
     * Get all reviews for a repository, ordered by newest first.
     */
    getReviewsByRepository(repositoryId: string): Promise<Review[]>;
    /**
     * Get a single review by ID, including all its issues.
     */
    getReviewById(reviewId: string): Promise<ReviewWithIssues | null>;
}
declare const reviewService: ReviewService;
export { reviewService, ReviewService };
//# sourceMappingURL=review.service.d.ts.map