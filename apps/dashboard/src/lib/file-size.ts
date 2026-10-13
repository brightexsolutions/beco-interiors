/**
 * One size wording for the whole upload path, D139: "640KB" under a
 * megabyte, "4.2MB" above, so a small photo never reads as 0.0MB. Its own
 * module because the queue, the preparer and the direct upload all say it,
 * and tests stub the latter two.
 */
export const megabytes = (bytes: number): string =>
  bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1048576).toFixed(1)}MB`;
