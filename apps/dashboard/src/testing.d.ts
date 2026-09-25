/**
 * Loads the jest-dom matcher types.
 *
 * The augmentation lives on the `/vitest` subpath, which a tsconfig `types`
 * entry cannot reach, so it is imported for its side effect instead. Without
 * it, toBeInTheDocument and toHaveAttribute type-check as missing properties
 * even though they run correctly at test time.
 */
import "@testing-library/jest-dom/vitest";
