import { type Reference, type RequestParameters, search } from "./crd.ts";
import { fetchWithRetry } from "./fetch_with_retry.ts";

const kv = await Deno.openKv();

async function getHitNum(query: string): Promise<number> {
  try {
    const hitNum = await kv.get<number>(["hitNum", query]);
    if (typeof hitNum.value == "number" && !Number.isNaN(hitNum.value)) {
      return hitNum.value;
    }
  } catch (e) {
    console.warn(e);
  }

  const result = await search({ type: "reference", query, results_num: 1 });
  return parseInt(result.hit_num);
}

async function getRandomReference(query: string): Promise<Reference> {
  const hitNum = await getHitNum(query);
  const index = Math.floor(Math.random() * hitNum) + 1;
  let request: RequestParameters;
  if (index < hitNum / 2) {
    request = {
      type: "reference",
      query,
      results_get_position: index,
      results_num: 1,
      sort: "reg-date",
      sort_order: "desc",
    };
  } else {
    request = {
      type: "reference",
      query,
      results_get_position: hitNum - index + 1,
      results_num: 1,
      sort: "reg-date",
      sort_order: "asc",
    };
  }
  const response = await search(request);
  await kv.set(["hitNum", query], parseInt(response.hit_num));
  const result = response.result;
  if (Array.isArray(result)) {
    return result[0].reference;
  } else {
    return result.reference;
  }
}

function summarizeReference(reference: Reference): string {
  return [
    `${reference.solution === "1" ? "【未解決】" : ""}`,
    `${reference.question}（${reference.system["lib-name"]}の事例）\n`,
    reference.url,
  ].join("");
}

async function postNote(text: string): Promise<void> {
  console.info(text);
  const host = Deno.env.get("HOST");
  const accessToken = Deno.env.get("ACCESS_TOKEN");
  const response = await fetchWithRetry(`https://${host}/api/notes/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "crd_misskey",
    },
    body: JSON.stringify({ i: accessToken, text }),
  });
  const body = await response.json();
  console.info(
    `Posted: https://${host}/notes/${body.createdNote.id}`,
  );
}

export async function postRandomReference(): Promise<void> {
  const reference = await getRandomReference('reg-id = ""');
  const text = summarizeReference(reference);
  await postNote(text);
}

export async function postRandomUnresolvedReference(): Promise<void> {
  const reference = await getRandomReference("solution = unresolved");
  const text = summarizeReference(reference);
  await postNote(text);
}

export async function postAccessRanking(rank: number): Promise<void> {
  const date = Temporal.Now.plainDateISO("Asia/Tokyo").subtract({ months: 1 });
  try {
    const text = await kv.get<string>([
      "accessRanking",
      date.year,
      date.month,
      rank,
    ]);
    if (text.value) {
      await postNote(text.value);
      return;
    }
  } catch (e) {
    console.warn(e);
  }

  const month = `${date.year}${`${date.month}`.padStart(2, "0")}`;
  const response = await search({
    type: "reference",
    "reg-date_from": `${month}01`,
    "reg-date_to": `${month}${date.daysInMonth}`,
    sort: "access-num",
    results_num: rank,
  });
  const result = response.result;
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i++) {
      const r = i + 1;
      const summary = summarizeReference(result[i].reference);
      const text = [
        summary,
        "\n",
        `<small>${date.year}年${date.month}月登録事例 `,
        `アクセス数 第${r}位</small>`,
      ].join("");
      if (r === rank) {
        await postNote(text);
      } else {
        await kv.set(["accessRanking", date.year, date.month, r], text);
      }
    }
  } else {
    const summary = summarizeReference(result.reference);
    const text = [
      summary,
      "\n",
      `<small>${date.year}年${date.month}月登録事例 `,
      `アクセス数 第${rank}位</small>`,
    ].join("");
    await postNote(text);
  }
}

export async function postApplauseRanking(rank: number): Promise<void> {
  const date = Temporal.Now.plainDateISO("Asia/Tokyo").subtract({ months: 1 });
  try {
    const text = await kv.get<string>([
      "applauseRanking",
      date.year,
      date.month,
      rank,
    ]);
    if (text.value) {
      await postNote(text.value);
      return;
    }
  } catch (e) {
    console.warn(e);
  }

  const month = `${date.year}${`${date.month}`.padStart(2, "0")}`;
  const response = await search({
    type: "reference",
    "reg-date_from": `${month}01`,
    "reg-date_to": `${month}${date.daysInMonth}`,
    sort: "applause-num",
    results_num: rank,
  });
  const result = response.result;
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i++) {
      const r = i + 1;
      const summary = summarizeReference(result[i].reference);
      const text = [
        summary,
        "\n",
        `<small>${date.year}年${date.month}月登録事例 `,
        `拍手数 第${r}位</small>`,
      ].join("");
      if (r === rank) {
        await postNote(text);
      } else {
        await kv.set(["applauseRanking", date.year, date.month, r], text);
      }
    }
  } else {
    const summary = summarizeReference(result.reference);
    const text = [
      summary,
      "\n",
      `<small>${date.year}年${date.month}月登録事例 `,
      `拍手数 第${rank}位</small>`,
    ].join("");
    await postNote(text);
  }
}
