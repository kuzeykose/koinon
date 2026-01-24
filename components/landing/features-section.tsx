import { BookMarked, BarChart3, Target, Search, Library, Users } from "lucide-react";

const features = [
  {
    icon: BookMarked,
    title: "Track Progress",
    description:
      "Log your reading sessions and watch your progress grow. Set page goals and track time spent reading.",
  },
  {
    icon: BarChart3,
    title: "Reading Stats",
    description:
      "Beautiful visualizations of your reading habits. See trends, streaks, and achievements at a glance.",
  },
  {
    icon: Target,
    title: "Set Goals",
    description:
      "Set yearly reading challenges and monthly targets. Stay motivated with progress tracking and reminders.",
  },
  {
    icon: Search,
    title: "Discover Books",
    description:
      "Get personalized book recommendations based on your reading history and preferences.",
  },
  {
    icon: Library,
    title: "Digital Library",
    description:
      "Organize your books into custom shelves. Track what you've read, want to read, and are currently reading.",
  },
  {
    icon: Users,
    title: "Reading Community",
    description:
      "Connect with fellow readers. Share reviews, join book clubs, and discover what others are reading.",
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-card py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-card-foreground md:text-4xl text-balance">
            Everything you need to become a better reader
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Powerful features designed to help you read more, discover great books, and build lasting reading habits.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl bg-background p-6 transition-all hover:shadow-md border border-border"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-primary transition-colors group-hover:bg-accent/30">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
