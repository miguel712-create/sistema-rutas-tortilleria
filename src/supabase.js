import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dyabnukmzypgvtwxhmlq.supabase.co";

const supabaseKey = "sb_publishable_udMirfNKnS8kLMkuVt75oA_iFyhXCoP";

export const supabase = createClient(supabaseUrl, supabaseKey);