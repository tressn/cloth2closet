import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Container } from "@/components/ui/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import UserRowActions from "./user-row-actions";
import AdminMessageButton from "@/components/admin/AdminMessageButton";
import AdminViewConversations from "@/components/admin/AdminViewConversations";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen">
        <Container>
          <div className="py-10">Forbidden</div>
        </Container>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container>
          <div className="py-10">
            <div className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
              Users
            </div>
            <div className="mt-2 text-[var(--text-md)] leading-[var(--lh-md)] text-[var(--muted)]">
              View accounts and make controlled edits.
            </div>
          </div>
        </Container>
      </header>

      <main className="py-10">
        <Container>
          <Card>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead className="text-[12px] text-[var(--muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-3 pr-4">User</th>
                      <th className="py-3 pr-4">Email</th>
                      <th className="py-3 pr-4">Role</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Verified</th>
                      <th className="py-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[var(--border)]">
                        <td className="py-3 pr-4 font-semibold text-[var(--text)]">{u.name ?? "—"}</td>
                        <td className="py-3 pr-4 text-[var(--text)]">{u.email}</td>
                        <td className="py-3 pr-4">
                          <Badge tone="neutral">{u.role ?? "—"}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge tone={u.status === "ACTIVE" ? "success" : u.status === "SUSPENDED" ? "danger" : "featured" as any}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-[12px] text-[var(--muted)]">
                          {u.emailVerified ? "Yes" : "No"}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="grid gap-2">
                            <UserRowActions userId={u.id} currentRole={u.role ?? null} currentStatus={u.status} />
                            <div className="flex gap-2">
                              <AdminMessageButton userId={u.id} />
                              <AdminViewConversations userId={u.id} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </Container>
      </main>
    </div>
  );
}