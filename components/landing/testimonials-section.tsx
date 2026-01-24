import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Bookly completely transformed how I approach reading. I've read more books this year than I have in the past five years combined.",
    author: "Sarah M.",
    role: "Teacher & Book Lover",
  },
  {
    quote:
      "The reading stats are addictive! I love seeing my progress and it keeps me motivated to read every day. Highly recommend!",
    author: "Michael R.",
    role: "Software Engineer",
  },
  {
    quote:
      "Finally, an app that understands readers. The book discovery feature has introduced me to so many amazing authors I never would have found.",
    author: "Emily K.",
    role: "Freelance Writer",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            Loved by readers everywhere
          </h2>
          <p className="text-lg text-muted-foreground">
            See what our community of book lovers has to say about Bookly.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="bg-card border-border">
              <CardContent className="p-6">
                <Quote className="mb-4 h-8 w-8 text-accent" />
                <blockquote className="mb-6 text-card-foreground leading-relaxed">
                  {testimonial.quote}
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/30" />
                  <div>
                    <p className="font-semibold text-card-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
