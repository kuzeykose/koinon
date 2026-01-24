const stats = [
  { value: "10K+", label: "Active Readers" },
  { value: "500K+", label: "Books Tracked" },
  { value: "2M+", label: "Pages Read" },
  { value: "4.9", label: "App Rating" },
];

export function StatsSection() {
  return (
    <section className="bg-primary py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-primary-foreground/80 md:text-base">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
