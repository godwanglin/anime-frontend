export type DisplayUser = {
	username?: string | null;
	fullName?: string | null;
};

export function displayUserName(user: DisplayUser | null | undefined, fallback = 'User') {
	return user?.fullName?.trim() || user?.username?.trim() || fallback;
}

export function userHandle(user: DisplayUser | null | undefined) {
	return user?.username?.trim() || '';
}

export function userInitial(user: DisplayUser | null | undefined, fallback = 'A') {
	return displayUserName(user, fallback).slice(0, 1).toUpperCase();
}
