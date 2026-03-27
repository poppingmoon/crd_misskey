import {
  postAccessRanking,
  postApplauseRanking,
  postRandomReference,
  postRandomUnresolvedReference,
} from "./scripts/post.ts";

Deno.cron(
  "Post a reference example",
  {
    minute: { exact: 30 },
    hour: { every: 1 },
  },
  { backoffSchedule: [500, 1000, 2000, 4000, 8000] },
  async () => {
    const date = Temporal.Now.zonedDateTimeISO("Asia/Tokyo");
    if (date.day == 3) {
      await postRandomUnresolvedReference();
    } else if (date.day == 15 && date.hour >= 9) {
      if (date.hour < 14) {
        await postAccessRanking(14 - date.hour);
      } else if (date.hour < 19) {
        await postApplauseRanking(19 - date.hour);
      } else {
        await postRandomReference();
      }
    } else {
      await postRandomReference();
    }
  },
);

Deno.serve(() => {
  return Response.redirect("https://github.com/poppingmoon/crd_misskey");
});
