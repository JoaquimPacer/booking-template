# Architecture

The high-level picture for booking-template. Diagrams use Mermaid.

## High-level architecture

```mermaid
graph LR
    subgraph Browser
        Visitor[Visitor]
        Admin[Admin / Instructor]
        Editor[Content Editor]
    end

    subgraph Vercel
        NextApp[Next.js App<br/>Marketing + Booking + Admin]
        Studio[Sanity Studio<br/>at /studio]
    end

    subgraph "External SaaS"
        Neon[Neon<br/>Postgres]
        SanityCloud[Sanity Content Lake]
        Stripe[Stripe<br/>Checkout + Webhooks]
        Resend[Resend<br/>Email + .ics]
        Twilio[Twilio<br/>SMS]
        GCal[Google Calendar API]
        GPlaces[Google Places API<br/>v1.5]
    end

    Visitor --> NextApp
    Admin --> NextApp
    Editor --> Studio
    NextApp --> Neon
    NextApp --> SanityCloud
    NextApp --> Stripe
    NextApp --> Resend
    NextApp --> Twilio
    NextApp --> GCal
    NextApp -.v1.5.-> GPlaces
    Studio --> SanityCloud
```

## Repo structure

```mermaid
graph TD
    Root["booking-template/"] --> Config["Top-level config<br/>package.json, tsconfig.json,<br/>next.config.ts, .env.example,<br/>sanity.config.ts, README.md"]
    Root --> Prisma["prisma/<br/>schema.prisma<br/>migrations/"]
    Root --> Sanity["sanity/<br/>schemas/<br/>(GROQ queries)"]
    Root --> Src["src/"]
    Root --> Tests["tests/<br/>e2e/<br/>unit/"]
    Root --> Docs["docs/<br/>decisions/ (ADRs)<br/>ONBOARD_NEW_CLIENT.md<br/>UPDATING_CONTENT.md<br/>ARCHITECTURE.md"]
    Root --> Scripts["scripts/<br/>(replicate-prospect.ts in v1.5)"]

    Src --> App["app/<br/>(Next.js App Router)"]
    Src --> Components["components/<br/>(shadcn/ui based)"]
    Src --> Lib["lib/<br/>stripe.ts, resend.ts,<br/>twilio.ts, google-calendar.ts,<br/>prisma.ts, sanity.ts, seo.ts"]
    Src --> Server["server/<br/>actions, route handlers"]

    App --> Marketing["(marketing)/<br/>home, services, about,<br/>FAQ, contact"]
    App --> Book["book/[serviceSlug]/<br/>booking flow"]
    App --> Api["api/<br/>stripe/webhook<br/>google/oauth<br/>twilio/<br/>sitemap.xml<br/>robots.txt"]
    App --> Admin["admin/<br/>(NextAuth-gated)"]
    App --> StudioRoute["studio/[[...index]]/<br/>(embedded Sanity)"]
```

## Database (v1 schema, ER diagram)

See `prisma/schema.prisma` for the canonical Prisma source. Diagram:

```mermaid
erDiagram
    Studio ||--o{ User : "has many"
    Studio ||--o{ Service : "offers"
    Studio ||--o{ AvailabilityRule : "defines"
    Studio ||--o{ AvailabilityException : "defines"
    Studio ||--o{ Booking : "owns"
    Service ||--o{ Booking : "is booked as"
    Booking ||--|| BookingAttendee : "has one"
    Booking ||--o| Payment : "may have"
    User ||--o{ BookingAttendee : "may be"

    Studio {
        string id PK
        string name
        string slug UK
        string timezone
    }
    User {
        string id PK
        string email UK
        string role "ADMIN|INSTRUCTOR|CLIENT"
        string studioId FK
        string googleRefreshToken
        string googleCalendarId
    }
    Service {
        string id PK
        string studioId FK
        string sanityId
        string title
        int durationMinutes
        int priceCents
    }
    AvailabilityRule {
        string id PK
        string studioId FK
        int dayOfWeek
        string startTime
        string endTime
    }
    AvailabilityException {
        string id PK
        string studioId FK
        datetime date
        bool isOpen
    }
    Booking {
        string id PK
        string studioId FK
        string serviceId FK
        datetime startTime "UTC"
        datetime endTime "UTC"
        string status
        string googleEventId
    }
    BookingAttendee {
        string id PK
        string bookingId FK,UK
        string name
        string email
    }
    Payment {
        string id PK
        string bookingId FK,UK
        string stripePaymentIntentId
        int totalCents
        string status
    }
```

When a multi-instructor / dance client lands, additive Prisma migrations bring in `BookingInstructor`, `WaitlistEntry`, `RoleType`, and the `splits` JSON on Payment. The full v2 schema is preserved at `booking-flow-pitches/templates/v2-future/schema-full.prisma`.

## Booking happy path

```mermaid
sequenceDiagram
    autonumber
    participant C as Client browser
    participant App as Next.js (Vercel)
    participant Sanity
    participant Neon as Postgres
    participant GCal as Google Calendar
    participant Stripe
    participant Resend
    participant Twilio

    C->>App: GET /services
    App->>Sanity: fetch service marketing copy
    App->>Neon: fetch Service rows
    App-->>C: render service list

    C->>App: pick service, request slots
    App->>Neon: query AvailabilityRule + existing Bookings
    App->>GCal: query free/busy
    App-->>C: available time slots

    C->>App: pick slot, fill form, submit
    App->>Neon: create Booking (PENDING) + Attendee
    App->>Stripe: create Checkout session
    App-->>C: redirect to Stripe Checkout
    C->>Stripe: pay
    Stripe->>App: webhook payment_intent.succeeded
    App->>Neon: update Booking to CONFIRMED + write Payment
    App->>GCal: insert calendar event
    App->>Resend: send confirmation email + .ics
    App->>Twilio: send SMS confirmation
    App-->>C: success page
```

## Where decisions live

ADRs (Architecture Decision Records) capture *why* in `docs/decisions/`. Numbered, immutable. To change a decision, write a new ADR that supersedes the old one rather than editing in place.

## Companion docs

This is a code repo. The companion docs repo at `github.com/JoaquimPacer/booking-flow-pitches` holds:
- v1 spec, long-term vision, and templates
- Per-client briefs, plans, session summaries
- Cross-AI handoff notes
