import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex gap-2">
        <Button>
          <Link href="/dashboard/settings">Settings</Link>
        </Button>
        <Button>
          <Link href="/dashboard/communities">Communities</Link>
        </Button>
        <Button>
          <Link href="/dashboard/shelf">Shelf</Link>
        </Button>
      </div>
    </div>
  );
}
