import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return new Response('Use POST', { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body: unknown = await request.json();

    return json({
      message: 'success',
      result: 'N/A (route criada para evitar erro 500)',
    });
  } catch (error) {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }
};
