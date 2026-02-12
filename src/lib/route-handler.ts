import { NextRequest } from "next/server";

export type DynamicSegments = {
  params?: Promise<{ [key: string]: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export type ResolvedSegments = {
  params?: { [key: string]: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export type RouteHandlerWithParams = (
  request: NextRequest,
  segment: ResolvedSegments,
) => Promise<Response>;

export const withParams = (handler: RouteHandlerWithParams) => {
  return async (request: NextRequest, segment: DynamicSegments) => {
    // Await the params automatically
    const resolvedSegment: ResolvedSegments = {
      params: segment.params ? await segment.params : undefined,
      searchParams: segment.searchParams
        ? await segment.searchParams
        : undefined,
    };

    return handler(request, resolvedSegment);
  };
};
