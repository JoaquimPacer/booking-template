# Updating content (for clients and admins)

This guide is for non-developers who own a deployed booking-template site (e.g. an instructor or studio admin). No coding required.

## What you can edit and where

| What | Where | Logged in as |
| --- | --- | --- |
| Page text, hero copy, photos | `<your-site>/studio` (Sanity Studio) | Sanity account (invited by Joaquim) |
| Service marketing copy (descriptions, photos) | `<your-site>/studio` | Sanity account |
| Instructor bio, photo | `<your-site>/studio` | Sanity account |
| FAQ items | `<your-site>/studio` | Sanity account |
| Site name, navigation labels | `<your-site>/studio` | Sanity account |
| Service price, duration, active/inactive | `<your-site>/admin` | Admin email + password |
| Schedule, weekly availability, vacation days | `<your-site>/admin` | Admin email + password |
| Bookings list, refunds, cancellations | `<your-site>/admin` | Admin email + password |

## Sanity Studio in plain English

Sanity Studio is a dashboard for editing the content on your website. Open `<your-site>/studio` and log in with your Sanity account. The left sidebar shows content types (Pages, Services, Instructors, FAQ, etc.). Click one, edit fields, and click **Publish**. Changes appear on your live site within 30 seconds.

You can:
- Upload photos by dragging into image fields
- Edit headings, paragraphs, and lists with a word-processor-style editor
- Reorder list items by dragging

You cannot:
- Change page layouts (where things appear on a page)
- Add new fields to a content type
- Change colors, fonts, or visual design

For those, contact Joaquim.

## Admin UI in plain English

Open `<your-site>/admin` and log in with the admin email and password you were given. From here you manage operational data like prices and schedules.

- **Bookings list:** every booking, with filters by date and status. Click one to see details, refund, or cancel.
- **Services:** edit prices and durations. To change marketing copy or photos, use Sanity Studio instead.
- **Availability:** weekly recurring hours plus one-off exceptions (vacation days, holidays).
- **Refunds:** click a booking, click **Refund**. Confirms in Stripe within seconds.

## Common tasks

- **Change a service price:** Admin UI > Services > pick the service > update Price > Save. Customers see the new price within 30 seconds.
- **Add a new instructor bio:** Sanity Studio > Instructors > New > fill name, bio, photo > Publish.
- **Block off vacation days:** Admin UI > Availability > Add Exception > pick date > Closed > Save.
- **Update FAQ:** Sanity Studio > FAQs > New (or pick existing) > question, answer > Publish.

## What to do if something looks wrong

Take a screenshot. Email or text Joaquim. Don't panic, the data isn't lost; we have backups.
