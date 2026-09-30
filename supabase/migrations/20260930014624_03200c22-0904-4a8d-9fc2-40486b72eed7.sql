REVOKE ALL ON FUNCTION public.get_partners(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_partners(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.void_match(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_partners(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_match(uuid) TO authenticated;