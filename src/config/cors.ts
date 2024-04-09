type CORSOptions = {
  origin: string | string[] | ((origin: string) => string | undefined | null);
  allowMethods?: string[];
  allowHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
  exposeHeaders?: string[];
};

export const corsConfig: CORSOptions = {
  origin: () => {
    return "*";
  },
};
