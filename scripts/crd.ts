import { parse } from "@libs/xml";

import { fetchWithRetry } from "./fetch_with_retry.ts";

export type RequestParameters = {
  type?: "reference" | "manual" | "collection" | "profile" | "all";
  query?: string;
  "crt-date_from"?: string;
  "crt-date_to"?: string;
  "reg-date_from"?: string;
  "reg-date_to"?: string;
  "lst-date_from"?: string;
  "lst-date_to"?: string;
  "lib-id"?: string;
  "lib-group"?:
    | "all"
    | "ndl"
    | "public"
    | "academic"
    | "special"
    | "school"
    | "archives";
  "results_format"?: "xml" | "rss";
  "results_get_position"?: number;
  "results_num"?: number;
  "sort"?:
    | "fit"
    | "reg-id"
    | "crt-date"
    | "reg-date"
    | "lst-date"
    | "access-num"
    | "applause-num"
    | "pro-key";
  "sort_order"?: "asc" | "desc";
};

export type ResultSet = {
  hit_num: string;
  results_get_position: string;
  results_num: string;
  results_cd: string;
  result: ResultItem | ResultItem[];
};

export type ResultItem = { reference: Reference };

export type Reference = {
  question: string;
  "reg-id": string;
  answer: string;
  "crt-date": string;
  solution?: "0" | "1";
  keyword?: string | string[];
  class?: Class | Class[];
  "res-type"?: string;
  "con-type"?: string;
  bibl?: Bibl | Bibl[];
  "ans-proc"?: string;
  "referral"?: string | string[];
  "pre-res"?: string;
  note?: string;
  "ptn-type"?: string;
  contri?: string | string[];
  system: System;
  url: string;
};

export type Class = {
  "@type": string;
  "@version"?: string;
  "#text": string;
};

export type Bibl = {
  "bibl-desc"?: string;
  "bibl-isbn"?: string;
  "bibl-note"?: string;
};

export type System = {
  "reg-date": string;
  "lst-date": string;
  "sys-id": string;
  "lib-id": string;
  "lib-name": string;
  "file-num": string;
};

export async function search(
  request: RequestParameters,
): Promise<ResultSet> {
  const url = new URL("https://crd.ndl.go.jp/api/refsearch");
  for (const [key, value] of Object.entries(request)) {
    url.searchParams.append(key, value.toString());
  }
  const result = await fetchWithRetry(url, {
    headers: {
      "Content-Type": "application/xml",
      "User-Agent": "crd_misskey",
    },
  });
  const xml = parse(await result.text());
  return xml["result_set"] as ResultSet;
}
