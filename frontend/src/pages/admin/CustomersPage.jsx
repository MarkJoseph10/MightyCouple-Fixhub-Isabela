import { useEffect, useState } from "react";
import api from "../../api/client";

export default function CustomersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        const { data } = await api.get("/users");
        setUsers(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load customers.");
      }
    }

    loadUsers();
  }, []);

  return (
    <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
      <h1 className="text-3xl font-semibold text-white">Customers</h1>
      {error && <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      <div className="mt-6 space-y-4">
        {users.map((user) => (
          <div key={user._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
              <div className="text-sm text-slate-300">
                <p className="capitalize">{user.role}</p>
                <p>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "No recent login"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

