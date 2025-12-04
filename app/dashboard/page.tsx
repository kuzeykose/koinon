import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Button>
        <Link href="/dashboard/settings">Settings</Link>
      </Button>
      <Button>
        <Link href="/dashboard/communities">Communities</Link>
      </Button>
    </div>
  );
}
