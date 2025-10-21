import { logout } from "@/lib/actions/auth";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button className="rounded px-3 py-1 border" type="submit">
        Log out
      </button>
    </form>
  );
}
