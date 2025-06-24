import * as argon2 from 'argon2';
export const POST = async ({ request }) => {
  const req = JSON.parse(await request.text());
  const res = await argon2.verify(req.channel.password, req.pass);
  return new Response(`${res}`);
};
