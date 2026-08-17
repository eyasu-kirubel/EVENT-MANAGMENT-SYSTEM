import React, { useEffect, useState } from "react";
import {
  BsCalendar3,
  BsClock,
  BsGeoAlt,
  BsPerson,
  BsTicketPerforated,
  BsShieldCheck,
  BsPeople,
  BsCreditCard,
  BsPrinter,
  BsDownload,
} from "react-icons/bs";
import "./ticket_page.css";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "";

export default function TicketPage() {
  const [ticket, setTicket] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTicket();
  }, []);

  async function loadTicket() {
    try {
      setLoading(true);
      setError("");

      /*
       * EXISTING TICKET API
       */
      const response = await fetch(`${API_BASE}/tickets/my`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to load your tickets.");
      }

      const data = await response.json();

      /*
       * Support different response formats
       */
      const tickets = Array.isArray(data)
        ? data
        : data.tickets || data.results || data.data || [];

      if (!tickets.length) {
        throw new Error("No ticket found.");
      }

      /*
       * Display the most recent ticket
       */
      const currentTicket = tickets[0];

      setTicket(currentTicket);

      /*
       * EXISTING BACKEND QR
       */
      const ticketId =
        currentTicket.id ||
        currentTicket.ticketId ||
        currentTicket.ticket_id;

      if (ticketId) {
        setQrUrl(
          `${API_BASE}/api/tickets/${encodeURIComponent(ticketId)}/qr`
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load ticket.");
    } finally {
      setLoading(false);
    }
  }

  function getValue(...values) {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }

    return "";
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(value) {
    if (!value) return "—";

    /*
     * If backend already returns a formatted time,
     * keep it.
     */
    if (
      typeof value === "string" &&
      !value.includes("T") &&
      !value.includes(" ")
    ) {
      return value;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getStatus() {
    const status = String(
      getValue(
        ticket?.status,
        ticket?.ticketStatus,
        ticket?.ticket_status,
        "ACTIVE"
      )
    ).toUpperCase();

    return status;
  }

  function getTicketId() {
    return getValue(
      ticket?.ticketId,
      ticket?.ticket_id,
      ticket?.id,
      "—"
    );
  }

  function getEventName() {
    return getValue(
      ticket?.eventName,
      ticket?.event_name,
      ticket?.event?.name,
      ticket?.event?.title,
      "Event"
    );
  }

  function getGuestName() {
    return getValue(
      ticket?.attendeeName,
      ticket?.attendee_name,
      ticket?.customerName,
      ticket?.customer_name,
      ticket?.userName,
      ticket?.user?.name,
      ticket?.user?.full_name,
      "Guest"
    );
  }

  function getVenue() {
    return getValue(
      ticket?.venue,
      ticket?.location,
      ticket?.eventVenue,
      ticket?.event_location,
      ticket?.event?.venue,
      ticket?.event?.location,
      "—"
    );
  }

  function getCategory() {
    return getValue(
      ticket?.category,
      ticket?.eventCategory,
      ticket?.event?.category,
      "Event"
    );
  }

  function getTicketType() {
    return getValue(
      ticket?.ticketType,
      ticket?.ticket_type,
      ticket?.type,
      "General"
    );
  }

  function getQuantity() {
    return getValue(
      ticket?.quantity,
      ticket?.qty,
      ticket?.numberOfTickets,
      ticket?.number_of_tickets,
      1
    );
  }

  function getPrice() {
    const value = getValue(
      ticket?.price,
      ticket?.totalPrice,
      ticket?.total_price,
      ticket?.amount,
      ticket?.total,
      0
    );

    const number = Number(value);

    if (Number.isNaN(number)) {
      return value;
    }

    return `ETB ${number.toLocaleString()}`;
  }

  function getDate() {
    return getValue(
      ticket?.date,
      ticket?.eventDate,
      ticket?.event_date,
      ticket?.event?.date,
      ticket?.startDate,
      ticket?.start_date
    );
  }

  function getTime() {
    return getValue(
      ticket?.time,
      ticket?.eventTime,
      ticket?.event_time,
      ticket?.event?.time,
      ticket?.startTime,
      ticket?.start_time
    );
  }

  function printTicket() {
    window.print();
  }

  function downloadQR() {
    if (!qrUrl) return;

    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `${getTicketId()}-qr`;
    link.target = "_blank";
    link.click();
  }

  if (loading) {
    return (
      <main className="ticket-page">
        <div className="ticket-loading">
          <div className="ticket-loading-spinner" />
          <p>Loading your ticket...</p>
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="ticket-page">
        <div className="ticket-error">
          <BsTicketPerforated />

          <h2>Ticket not found</h2>

          <p>{error || "There is no ticket available."}</p>

          <button
            className="ticket-action primary"
            onClick={loadTicket}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const status = getStatus();
  const isUsed =
    status === "USED" ||
    status === "SCANNED" ||
    status === "EXPIRED";

  const eventName = getEventName();
  const guestName = getGuestName();
  const venue = getVenue();
  const category = getCategory();
  const ticketType = getTicketType();
  const quantity = getQuantity();
  const price = getPrice();
  const ticketId = getTicketId();

  const date = getDate();
  const time = getTime();

  return (
    <main className="ticket-page">

      <div className="ticket-wrapper">

        {/* =====================================
            TICKET
        ===================================== */}

        <article className="event-ticket">

          {/* HEADER */}

          <header className="ticket-header">

            <div className="ticket-brand">

              <div className="ticket-logo">
                <BsTicketPerforated />
              </div>

              <div>
                <strong>EventManager</strong>
                <span>Digital Event Ticket</span>
              </div>

            </div>

            <div
              className={`ticket-status ${
                isUsed ? "used" : "active"
              }`}
            >
              <BsShieldCheck />

              {isUsed ? "USED" : "ACTIVE"}
            </div>

          </header>


          {/* EVENT TITLE */}

          <section className="ticket-event">

            <div className="event-title-area">

              <span className="event-category">
                {category}
              </span>

              <h1>{eventName}</h1>

              <p>
                Present this ticket at the entrance
              </p>

            </div>

            <div className="ticket-number">

              <span>Ticket</span>

              <strong>
                #{ticketId}
              </strong>

            </div>

          </section>


          {/* =====================================
              LARGE QR CODE
          ===================================== */}

          <section className="qr-area">

            <div className="qr-container">

              {qrUrl ? (
                <img
                  className="ticket-qr"
                  src={qrUrl}
                  alt="Ticket QR code"
                />
              ) : (
                <div className="qr-missing">
                  QR unavailable
                </div>
              )}

            </div>

            <h3>
              Scan this QR code
            </h3>

            <p>
              Keep your screen brightness high
              for faster scanning.
            </p>

          </section>


          {/* DIVIDER */}

          <div className="ticket-perforation">

            <span />
            <span />
            <span />

          </div>


          {/* =====================================
              GUEST
          ===================================== */}

          <section className="guest-section">

            <span className="section-label">
              Guest
            </span>

            <div className="guest-name">

              <div className="guest-icon">
                <BsPerson />
              </div>

              <strong>
                {guestName}
              </strong>

            </div>

          </section>


          {/* =====================================
              SERVICES
          ===================================== */}

          <section className="services-section">

            <div className="section-heading">

              <h2>
                Services
              </h2>

            </div>

            <div className="service-card">

              {/* SERVICE HEADER */}

              <div className="service-header">

                <div>

                  <h3>
                    {eventName}
                  </h3>

                  <span>
                    {ticketType}
                  </span>

                </div>

                <strong className="service-price">
                  {price}
                </strong>

              </div>


              {/* STATUS */}

              <div className="service-status-row">

                <span>
                  Status
                </span>

                <strong
                  className={
                    isUsed
                      ? "status-used"
                      : "status-active"
                  }
                >
                  {isUsed ? "USED" : "ACTIVE"}
                </strong>

              </div>


              {/* DATE / TIME */}

              <div className="service-details">

                <div className="service-detail">

                  <div className="detail-icon">
                    <BsCalendar3 />
                  </div>

                  <div>

                    <span>
                      Date
                    </span>

                    <strong>
                      {formatDate(date)}
                    </strong>

                  </div>

                </div>


                <div className="service-detail">

                  <div className="detail-icon">
                    <BsClock />
                  </div>

                  <div>

                    <span>
                      Time
                    </span>

                    <strong>
                      {formatTime(time)}
                    </strong>

                  </div>

                </div>

              </div>


              {/* LOCATION */}

              <div className="service-location">

                <div className="detail-icon">
                  <BsGeoAlt />
                </div>

                <div>

                  <span>
                    Location
                  </span>

                  <strong>
                    {venue}
                  </strong>

                </div>

              </div>


              {/* QUANTITY */}

              <div className="service-footer">

                <div>

                  <BsPeople />

                  <span>
                    Quantity
                  </span>

                </div>

                <strong>
                  {quantity} ticket
                  {Number(quantity) === 1 ? "" : "s"}
                </strong>

              </div>

            </div>

          </section>


          {/* =====================================
              PAYMENT / TICKET INFO
          ===================================== */}

          <section className="ticket-info-grid">

            <div className="ticket-info">

              <BsCreditCard />

              <div>

                <span>
                  Total paid
                </span>

                <strong>
                  {price}
                </strong>

              </div>

            </div>


            <div className="ticket-info">

              <BsTicketPerforated />

              <div>

                <span>
                  Ticket type
                </span>

                <strong>
                  {ticketType}
                </strong>

              </div>

            </div>

          </section>


          {/* IMPORTANT */}

          <div className="ticket-important">

            <strong>
              Important
            </strong>

            <p>
              This QR code is for one-time entrance
              verification. The ticket becomes used
              only after the organizer successfully
              scans it.
            </p>

          </div>


          {/* ACTIONS */}

          <div className="ticket-actions">

            <button
              type="button"
              className="ticket-action primary"
              onClick={printTicket}
            >
              <BsPrinter />
              Print / Save Ticket
            </button>

            {qrUrl && (
              <button
                type="button"
                className="ticket-action secondary"
                onClick={downloadQR}
              >
                <BsDownload />
                QR Code
              </button>
            )}

          </div>

        </article>

      </div>

    </main>
  );
}