declare module 'google-trends-api' {
  export interface InterestOverTimeOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
    hl?: string;
    timezone?: number;
    category?: number;
    property?: string;
    granularTimeResolution?: boolean;
  }

  export function interestOverTime(
    options: InterestOverTimeOptions,
  ): Promise<string>;

  const _default: {
    interestOverTime: typeof interestOverTime;
  };
  export default _default;
}
