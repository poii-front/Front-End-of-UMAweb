import React, { useEffect, useMemo, useRef, useState } from "react";

const TYPE_ORDER = ["Speed", "Stamina", "Power", "Guts", "Wit", "Friend", "Group"];
const RARITIES = ["SSR", "SR", "R"];
const ICONS = {
  Speed: "⚡",
  Stamina: "💧",
  Power: "💪",
  Guts: "🔥",
  Wit: "🧠",
  Friend: "🤝",
  Group: "👥",
  Unknown: "❔",
};
const TYPE_NAMES = {
  speed: "Speed",
  stamina: "Stamina",
  power: "Power",
  guts: "Guts",
  wit: "Wit",
  intelligence: "Wit",
  int: "Wit",
  friend: "Friend",
  group: "Group",
};
const CARD_IMAGE_FIELDS = ["image", "image_url", "art_url"];
const TABS = [
  ["chars", "Characters"],
  ["cards", "Support Cards"],
  ["builds", "Builds"],
  ["saved", "Saved Builds"],
];

function firstImage(list) {
  const first = Array.isArray(list) ? list[0] : list;
  if (!first) return "";
  if (typeof first === "string") return first;
  return first.image || first.url || first.src || first.image_url || first.path || "";
}

function normalizeType(type) {
  return TYPE_NAMES[String(type || "").toLowerCase()] || (type ? String(type) : "Unknown");
}

function normalizeRarity(card) {
  if (card.rarityString) return String(card.rarityString).toUpperCase();
  return { 1: "R", 2: "SR", 3: "SSR" }[card.rarity] || "R";
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`${url} returned an invalid response (${response.status})`);
  }
  if (!response.ok) {
    throw new Error(payload.error || `${url} returned status ${response.status}`);
  }
  return payload;
}

function normalizeBuild(build) {
  const character = build.character;
  return {
    buildId: build.buildId,
    name: build.name,
    char: character && typeof character === "object"
      ? character.name || character.name_en || ""
      : character || "",
    cards: (build.supportCards || []).map((card) =>
      card && typeof card === "object" ? card.id : card
    ),
  };
}

function readTheme() {
  try {
    const savedTheme = localStorage.getItem("uma_theme");
    if (savedTheme) return savedTheme;
  } catch (error) {
    console.warn("Could not read the saved theme from local storage.", error);
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function hue(name) {
  let value = 0;
  for (const character of name) value = (value * 31 + character.charCodeAt(0)) % 360;
  return value;
}

function CardArt({ card, characterImage, characterName = "" }) {
  const image = card?.image || characterImage;
  return (
    <div className="art">
      {card && <i className="ic">{ICONS[card.type] || ICONS.Unknown}</i>}
      {card && <span className="rb">{card.rarity}</span>}
      {image && (
        <img
          className="pt"
          src={image}
          alt={card?.name || characterName}
          loading="lazy"
          onError={(event) => event.currentTarget.remove()}
        />
      )}
    </div>
  );
}

function FilterBar({ characters, types, filters, onChange }) {
  return (
    <div className="filters">
      <select aria-label="Filter by character" value={filters.char} onChange={(event) => onChange("char", event.target.value)}>
        <option value="">All Characters</option>
        {characters.map((character) => <option key={character.id} value={character.name}>{character.name}</option>)}
      </select>
      <select aria-label="Filter by type" value={filters.type} onChange={(event) => onChange("type", event.target.value)}>
        <option value="">All Types</option>
        {types.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      <select aria-label="Filter by rarity" value={filters.rarity} onChange={(event) => onChange("rarity", event.target.value)}>
        <option value="">All Rarities</option>
        {RARITIES.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
      </select>
    </div>
  );
}

function CardTile({ card, pickable = false, onPick }) {
  const delay = (Number(card.id) % 12) * 40;
  function handleKeyDown(event) {
    if (pickable && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onPick(card.id);
    }
  }
  return (
    <div
      className={`card frame t-${card.type} r-${card.rarity}${pickable ? " pick" : ""}`}
      style={{ "--d": `${delay}ms` }}
      onClick={pickable ? () => onPick(card.id) : undefined}
      onKeyDown={handleKeyDown}
      role={pickable ? "button" : undefined}
      tabIndex={pickable ? 0 : undefined}
    >
      <CardArt card={card} />
      <div className="info">
        <b>{card.name}</b>
        <span className="muted">{card.char}</span>
        <span className="ty">{ICONS[card.type] || ICONS.Unknown} {card.type}</span>
      </div>
    </div>
  );
}

function CardList({ cards, pickable = false, onPick }) {
  if (!cards.length) return <div className="empty">No cards match these filters.</div>;
  return (
    <div className="grid">
      {cards.map((card) => <CardTile key={card.id} card={card} pickable={pickable} onPick={onPick} />)}
    </div>
  );
}

function App() {
  const [page, setPage] = useState("cards");
  const [characters, setCharacters] = useState([]);
  const [cards, setCards] = useState([]);
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({ char: "", type: "", rarity: "" });
  const [slots, setSlots] = useState(Array(6).fill(null));
  const [buildName, setBuildName] = useState("");
  const [buildCharacter, setBuildCharacter] = useState("");
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [theme, setTheme] = useState(readTheme);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pickerSlot, setPickerSlot] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const dialogRef = useRef(null);

  const filteredCards = useMemo(() => cards.filter((card) =>
    (!filters.char || card.char === filters.char) &&
    (!filters.type || card.type === filters.type) &&
    (!filters.rarity || card.rarity === filters.rarity)), [cards, filters]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setLoadError("");
      try {
        const [characterJson, cardJson, buildJson] = await Promise.all([
          requestJson("/characters"),
          requestJson("/supportcards"),
          requestJson("/builds"),
        ]);
        const loadedCharacters = characterJson.data
          .map((character) => ({
            id: character.id,
            name: character.name_en || "Unknown",
            image: firstImage(character.images),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        const nameById = new Map(loadedCharacters.map((character) => [character.id, character.name]));
        const loadedCards = cardJson.data.map((card) => ({
          id: card.id,
          name: card.name_en,
          char: nameById.get(card.chara_id) || "Unknown",
          type: normalizeType(card.type),
          rarity: normalizeRarity(card),
          image: CARD_IMAGE_FIELDS.map((field) => card[field]).find(Boolean) || "",
        }));
        const loadedTypes = [...new Set(loadedCards.map((card) => card.type))]
          .sort((a, b) => {
            const indexA = TYPE_ORDER.indexOf(a);
            const indexB = TYPE_ORDER.indexOf(b);
            return (indexA < 0 ? 99 : indexA) - (indexB < 0 ? 99 : indexB);
          });
        if (!cancelled) {
          setCharacters(loadedCharacters);
          setCards(loadedCards);
          setTypes(loadedTypes);
          setSavedBuilds(buildJson.data.map(normalizeBuild));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadError(`Couldn't load data (${error.message}). Check the terminal running "node app.js" for errors.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [retry]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pickerSlot !== null && !dialog.open) dialog.showModal();
    if (pickerSlot === null && dialog.open) dialog.close();
  }, [pickerSlot]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = window.setTimeout(() => setToastMessage(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function showCharacter(character) {
    setFilters({ char: character.name, type: "", rarity: "" });
    setPage("cards");
  }

  function pickCard(id) {
    if (slots.some((slotId, index) => slotId === id && index !== pickerSlot)) {
      setToastMessage("Card already in this build");
      return;
    }
    setSlots((current) => current.map((slotId, index) => index === pickerSlot ? id : slotId));
    setPickerSlot(null);
  }

  function clearBuild() {
    setSlots(Array(6).fill(null));
    setBuildName("");
    setBuildCharacter("");
  }

  async function saveBuild() {
    if (slots.some((slot) => slot === null)) {
      setToastMessage("Pick all 6 cards first");
      return;
    }
    const character = characters.find((item) => item.name === buildCharacter);
    if (!character) {
      setToastMessage("Pick a character first");
      return;
    }
    try {
      const saved = await requestJson("/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: buildName.trim() || `Build ${savedBuilds.length + 1}`,
          character: { id: character.id, name: character.name },
          supportCards: slots.map((id) => cards.find((card) => card.id === id)),
        }),
      });
      setSavedBuilds((current) => [normalizeBuild(saved), ...current]);
      clearBuild();
      setToastMessage("Build saved!");
      setPage("saved");
    } catch (error) {
      console.error("Could not save build:", error);
      setToastMessage(`Could not save build: ${error.message}`);
    }
  }

  function loadBuild(build) {
    setSlots(build.cards.map((id) => cards.some((card) => card.id === id) ? id : null));
    setBuildName(build.name);
    setBuildCharacter(build.char || "");
    setPage("builds");
  }

  async function deleteBuild(build) {
    try {
      await requestJson(`/builds/${encodeURIComponent(build.buildId)}`, { method: "DELETE" });
      setSavedBuilds((current) => current.filter((item) => item.buildId !== build.buildId));
    } catch (error) {
      console.error("Could not delete build:", error);
      setToastMessage(`Could not delete build: ${error.message}`);
    }
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("uma_theme", nextTheme);
    } catch (error) {
      console.warn("Could not save the theme to local storage.", error);
    }
  }

  function renderCharacters() {
    return (
      <>
        <h2>Characters</h2>
        <div className="grid">
          {characters.map((character) => (
            <div
              className="card frame pick"
              key={character.id}
              style={{ "--tc": `hsl(${hue(character.name)} 55% 50%)` }}
              onClick={() => showCharacter(character)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") showCharacter(character);
              }}
              role="button"
              tabIndex={0}
            >
              <CardArt characterImage={character.image} characterName={character.name} />
              <div className="info">
                <b>{character.name}</b>
                <span className="muted">{cards.filter((card) => card.char === character.name).length} card(s)</span>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderBuilds() {
    const selectedCharacterImage = characters.find((character) => character.name === buildCharacter)?.image;
    return (
      <>
        <h2>Builds</h2>
        <div className="build">
          <div>
            <div className="panel character-picker" style={{ marginBottom: 12 }}>
              <CardArt characterImage={selectedCharacterImage} characterName={buildCharacter} />
              <select
                className="character-picker-select"
                style={{ width: "100%" }}
                value={buildCharacter}
                onChange={(event) => setBuildCharacter(event.target.value)}
              >
                <option value="">Pick character</option>
                {characters.map((character) => <option key={character.id} value={character.name}>{character.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="slots">
              {slots.map((id, index) => {
                const card = cards.find((item) => item.id === id);
                return card ? (
                  <div className={`slot frame t-${card.type} r-${card.rarity}`} key={index} onClick={() => setPickerSlot(index)}>
                    <button
                      className="x"
                      type="button"
                      aria-label={`Remove card from slot ${index + 1}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSlots((current) => current.map((slotId, slotIndex) => slotIndex === index ? null : slotId));
                      }}
                    >
                      ×
                    </button>
                    <CardArt card={card} />
                    <div className="info">
                      <b>{card.char}</b>
                      <span className="ty">{ICONS[card.type] || ICONS.Unknown} {card.type}</span>
                    </div>
                  </div>
                ) : (
                  <div className="slot" key={index} onClick={() => setPickerSlot(index)}>
                    <span className="muted">+ Pick card {index + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="row">
              <input placeholder="Build name" value={buildName} onChange={(event) => setBuildName(event.target.value)} />
              <button className="btn" type="button" onClick={saveBuild}>Save Build</button>
              <button className="btn alt" type="button" onClick={clearBuild}>Clear</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderSavedBuilds() {
    return (
      <>
        <h2>Saved Builds</h2>
        {!savedBuilds.length ? (
          <div className="empty">No saved builds yet. Make one in the Builds tab.</div>
        ) : savedBuilds.map((build) => (
          <div className="saved" key={build.buildId}>
            <h3>
              <span>
                {build.name}
                {build.char && <span className="muted" style={{ fontWeight: 400 }}> — {build.char}</span>}
              </span>
              <span>
                <button className="btn alt" type="button" onClick={() => loadBuild(build)}>Load</button>
                <button
                  className="btn alt"
                  type="button"
                  onClick={() => deleteBuild(build)}
                >
                  Delete
                </button>
              </span>
            </h3>
            <div className="mini">
              {build.cards.map((id) => cards.find((card) => card.id === id)).filter(Boolean).map((card, cardIndex) => (
                <div className={`frame t-${card.type} r-${card.rarity}`} key={`${card.id}-${cardIndex}`}>
                  <CardArt card={card} />
                  <div className="info">
                    <b>{card.char}</b>
                    <span className="ty">{ICONS[card.type] || ICONS.Unknown} {card.type} · {card.rarity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  let content;
  if (loading) {
    content = <div className="status">Loading cards… the first load can take a little while.</div>;
  } else if (loadError) {
    content = (
      <div className="status">
        {loadError}<br /><br />
        <button className="btn" type="button" onClick={() => setRetry((current) => current + 1)}>Try again</button>
      </div>
    );
  } else if (page === "chars") {
    content = renderCharacters();
  } else if (page === "cards") {
    content = (
      <>
        <h2>Support Cards</h2>
        <FilterBar characters={characters} types={types} filters={filters} onChange={updateFilter} />
        <CardList cards={filteredCards} />
      </>
    );
  } else if (page === "builds") {
    content = renderBuilds();
  } else {
    content = renderSavedBuilds();
  }

  return (
    <>
      <header>
        <div className="logo">UMA<span>web</span></div>
        <nav>
          {TABS.map(([key, label]) => (
            <button className={key === page ? "on" : ""} key={key} type="button" onClick={() => setPage(key)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="theme-btn" type="button" onClick={toggleTheme} aria-label="Toggle light/dark mode">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>
      <main>{content}</main>
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          setPickerSlot(null);
        }}
        onClose={() => setPickerSlot(null)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>Pick a support card</b>
          <button className="btn alt" type="button" onClick={() => setPickerSlot(null)}>Close</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <FilterBar characters={characters} types={types} filters={filters} onChange={updateFilter} />
        </div>
        <div style={{ overflow: "auto", maxHeight: "55vh" }}>
          <CardList cards={filteredCards} pickable onPick={pickCard} />
        </div>
      </dialog>
      <div className={`toast${toastMessage ? " show" : ""}`} role="status">{toastMessage}</div>
    </>
  );
}

export default App;
