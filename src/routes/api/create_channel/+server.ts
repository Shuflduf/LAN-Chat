import { env } from '$env/dynamic/public';
import { Client, Databases, ID } from 'appwrite';
import * as argon2 from 'argon2';

export const POST = async ({ request }) => {
	const req = JSON.parse(await request.text());

	const argon2Pass = req.password ? await argon2.hash(req.password) : null;

	const client = new Client()
		.setEndpoint(env.PUBLIC_APPWRITE_ENDPOINT)
		.setProject(env.PUBLIC_APPWRITE_PROJECT_ID);
	const databases = new Databases(client);
	const res = await databases.createDocument('main', env.PUBLIC_CHANNELS_ID, ID.unique(), {
		name: req.channelName,
		password: argon2Pass,
		expiration: req.expiration,
	});

	return new Response(JSON.stringify(res));
};
