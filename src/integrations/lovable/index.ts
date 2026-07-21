// Self-hosting compatible wrapper around native Supabase OAuth.
// Replaces the Lovable Cloud managed OAuth broker so the project works on
// any standard Supabase project without the @lovable.dev/cloud-auth-js package.

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri || window.location.origin,
          queryParams: opts?.extraParams,
        },
      });

      if (error) {
        return { error };
      }

      // Native Supabase OAuth always redirects the browser to the provider.
      return { redirected: true, url: data.url };
    },
  },
};
