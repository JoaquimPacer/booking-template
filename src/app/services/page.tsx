import { ServiceCard } from "@/components/service-card";
import { getAllServices } from "@/lib/sanity-queries";

export const revalidate = 60;

export const metadata = {
  title: "Services",
};

export default async function ServicesPage() {
  const services = await getAllServices();

  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Services
        </h1>
        <p className="mt-4 text-base text-foreground/70">
          Browse what we offer. Click any service for details and to book.
        </p>
      </div>

      {services.length === 0 ? (
        <div className="mt-16 text-center text-foreground/60">
          <p>No services available yet.</p>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
