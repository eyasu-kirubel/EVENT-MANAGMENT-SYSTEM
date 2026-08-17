import { useMemo, useState } from "react";
import {
  BsPlusLg,
  BsTags,
  BsTrash3,
  BsMusicNoteBeamed,
  BsPalette,
  BsTrophy,
  BsBook,
  BsBriefcase,
  BsCupHot,
  BsStars,
  BsPerson,
  BsGlobe,
  BsTools,
  BsCollectionPlay,
} from "react-icons/bs";
import { EVENT_CATEGORIES } from "../../constants/categories";

const KEY = "organizerEventCategories";

function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getCategoryIcon(category) {
  const value = String(category).toLowerCase();

  if (value.includes("music")) return <BsMusicNoteBeamed />;
  if (value.includes("art")) return <BsPalette />;
  if (value.includes("sport")) return <BsTrophy />;
  if (value.includes("book")) return <BsBook />;
  if (value.includes("business")) return <BsBriefcase />;
  if (value.includes("food")) return <BsCupHot />;
  if (value.includes("festival")) return <BsStars />;
  if (value.includes("fashion")) return <BsPerson />;
  if (value.includes("workshop")) return <BsTools />;
  if (value.includes("kids") || value.includes("family")) return <BsPerson />;
  if (value.includes("cultural")) return <BsGlobe />;
  if (value.includes("movie") || value.includes("film")) return <BsCollectionPlay />;

  return <BsTags />;
}

export default function OrganizerCategories() {
  const [custom, setCustom] = useState(loadCategories);
  const [name, setName] = useState("");

  const all = useMemo(
    () => [...EVENT_CATEGORIES, ...custom],
    [custom]
  );

  function addCategory(e) {
    e.preventDefault();

    const value = name.trim();

    if (
      !value ||
      all.some((item) => item.toLowerCase() === value.toLowerCase())
    ) {
      return;
    }

    const next = [...custom, value];
    setCustom(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    setName("");
  }

  function removeCategory(value) {
    const next = custom.filter((item) => item !== value);
    setCustom(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  return (
    <section className="page dashboard-page organizer-categories-page">
      <div className="categories-page-header">
        <div>
          <span className="section-kicker">EVENT SETUP</span>
          <h2>Event Categories</h2>
          <p>
            Organize your events with simple, reusable categories.
          </p>
        </div>

        <div className="categories-header-icon">
          <BsTags />
        </div>
      </div>

      <div className="category-manager-grid">
        <form
          className="surface-card category-add-card category-modern-card"
          onSubmit={addCategory}
        >
          <div className="category-card-icon">
            <BsPlusLg />
          </div>

          <div className="category-card-title">
            <h3>Create a category</h3>
            <p>
              Add your own category and use it immediately when creating an
              event.
            </p>
          </div>

          <label className="field-label" htmlFor="category-name">
            Category name
          </label>

          <div className="category-input-row">
            <input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Graduation"
              maxLength={40}
            />

            <button className="btn btn-primary category-add-button" type="submit">
              <BsPlusLg />
              Add
            </button>
          </div>

          <small className="form-hint">
            Custom categories are saved in this browser. No backend or
            database changes are made.
          </small>
        </form>

        <div className="surface-card category-list-card category-modern-card">
          <div className="categories-list-header">
            <div>
              <span className="section-kicker">BROWSE</span>
              <h3>Available Categories</h3>
              <p>Select from your existing categories when creating events.</p>
            </div>

            <span className="category-count">
              {all.length} categories
            </span>
          </div>

          <div className="category-chip-list category-chip-list-modern">
            {all.map((category) => {
              const isCustom = custom.includes(category);

              return (
                <div
                  className={`category-chip category-chip-modern ${
                    isCustom ? "custom-category" : ""
                  }`}
                  key={category}
                >
                  <span className="category-chip-icon">
                    {getCategoryIcon(category)}
                  </span>

                  <span className="category-chip-name">{category}</span>

                  {isCustom && (
                    <button
                      type="button"
                      className="category-delete-button"
                      onClick={() => removeCategory(category)}
                      title={`Delete ${category}`}
                      aria-label={`Delete ${category}`}
                    >
                      <BsTrash3 />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
