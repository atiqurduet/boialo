import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const parseEdgeFunctionError = async (error: unknown): Promise<string> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      return payload?.error || payload?.message || `HTTP ${error.context.status}`;
    } catch {
      return `HTTP ${error.context.status}`;
    }
  }

  if (error instanceof FunctionsRelayError) {
    return "Function relay error. আবার চেষ্টা করুন।";
  }

  if (error instanceof FunctionsFetchError) {
    return "Network error. ইন্টারনেট/সেশন চেক করুন।";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "কুরিয়ার বুকিং ব্যর্থ হয়েছে";
};

export const invokeCourierBooking = async (orderId: string, courierProvider: string) => {
  const { data, error } = await supabase.functions.invoke("courier-booking", {
    body: { order_id: orderId, courier_provider: courierProvider },
  });

  if (error) {
    throw new Error(await parseEdgeFunctionError(error));
  }

  if (!data?.success) {
    throw new Error(data?.error || "কুরিয়ার বুকিং ব্যর্থ হয়েছে");
  }

  return data;
};
