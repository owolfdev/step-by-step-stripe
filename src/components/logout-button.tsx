import { logout } from "@/lib/actions/auth";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        type="submit"
      >
        Log out
      </button>
    </form>
  );
}
