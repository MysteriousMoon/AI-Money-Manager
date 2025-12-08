import { getUsers } from '@/app/actions/admin';
import UserListClient from './user-list-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const { data: users } = await getUsers();

    const serializedUsers = users?.map(user => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    })) || [];

    return (
        <UserListClient users={serializedUsers} />
    );
}
