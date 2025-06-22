import { env } from '$env/dynamic/public';
import { Client, Databases, Query } from 'appwrite';
import * as argon2 from 'argon2';

export const POST = async ({ request }) => {
  const req = JSON.parse(await request.text());

  const client = new Client()
    .setEndpoint(env.PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.PUBLIC_APPWRITE_PROJECT_ID);
  const databases = new Databases(client);

  const targetChannel = await databases.getDocument('main', env.PUBLIC_CHANNELS_ID, req.id);
  const needsPassword = targetChannel.password != null;

  if (needsPassword) {
    const passwordMatches = await argon2.verify(targetChannel.password, req.password);
    if (!passwordMatches) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }));
    }
  }

  let queries: string[] = [
    Query.equal('channels', req.id),
    Query.orderDesc('$createdAt'),
    Query.limit(20),
  ];

  if (req.lastMessage) {
    queries.push(Query.cursorAfter(req.lastMessage));
  }

  let res = await databases.listDocuments('main', env.PUBLIC_MESSAGES_ID, queries);
  console.log(res.documents)
  return new Response(JSON.stringify(res.documents));
};
