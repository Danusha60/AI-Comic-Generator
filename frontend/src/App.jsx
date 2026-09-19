
import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./App.css";

function App() {
  const [story, setStory] = useState("");
  const [style, setStyle] = useState("Manga");
  const [panels, setPanels] = useState("4");

  const [showPreview, setShowPreview] = useState(false);
  const [comicPanels, setComicPanels] = useState([]);

  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);

  const comicRef = useRef(null);

  // ======================================
  // GENERATE COMIC STORYBOARD
  // ======================================

  const handleGenerate = async () => {
    if (story.trim() === "") {
      alert("Please enter your story!");
      return;
    }

    setLoading(true);
    setShowPreview(false);

    try {
      const response = await fetch(
        "http://localhost:5000/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            story: story,
            style: style,
            panels: panels,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Storyboard generation failed"
        );
      }

      console.log("AI Storyboard Response:", data);

      setComicPanels(data.panels);
      setShowPreview(true);

    } catch (error) {
      console.error("Storyboard Error:", error);
      alert(error.message);

    } finally {
      setLoading(false);
    }
  };

  // ======================================
  // GENERATE AI IMAGES
  // ======================================

  const generateImages = async () => {
    if (comicPanels.length === 0) {
      alert("Please generate a storyboard first!");
      return;
    }

    setGeneratingImages(true);

    try {
      const updatedPanels = [];

      for (const panel of comicPanels) {
        const response = await fetch(
          "http://localhost:5000/api/generate-image",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              visual_description:
                panel.visual_description,

              style: style,

              panel_number:
                panel.panel_number,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Image generation failed"
          );
        }

        updatedPanels.push({
          ...panel,
          imageUrl: data.imageUrl,
        });
      }

      setComicPanels(updatedPanels);

      alert("All images generated successfully!");

    } catch (error) {
      console.error("Image Generation Error:", error);
      alert(error.message);

    } finally {
      setGeneratingImages(false);
    }
  };

  // ======================================
  // DOWNLOAD COMIC AS PNG
  // ======================================

  const downloadComic = async () => {
    if (!comicRef.current) {
      alert("Please generate a comic first!");
      return;
    }

    try {
      const canvas = await html2canvas(
        comicRef.current,
        {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        }
      );

      const image = canvas.toDataURL("image/png");

      const link = document.createElement("a");

      link.href = image;
      link.download = "my-ai-comic.png";

      link.click();

    } catch (error) {
      console.error("Export Error:", error);
      alert("Failed to download comic.");
    }
  };

  // ======================================
  // DOWNLOAD COMIC AS PDF
  // ======================================

  const downloadPDF = async () => {
    if (!comicRef.current) {
      alert("Please generate a comic first!");
      return;
    }

    try {
      const canvas = await html2canvas(
        comicRef.current,
        {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        }
      );

      const imageData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;

      const imageWidth = pageWidth - margin * 2;

      const imageHeight =
        (canvas.height * imageWidth) / canvas.width;

      const usableHeight = pageHeight - margin * 2;

      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        position,
        imageWidth,
        imageHeight
      );

      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        position = margin - (imageHeight - heightLeft);

        pdf.addPage();

        pdf.addImage(
          imageData,
          "PNG",
          margin,
          position,
          imageWidth,
          imageHeight
        );

        heightLeft -= usableHeight;
      }

      pdf.save("my-ai-comic.pdf");

    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to download PDF.");
    }
  };

  // ======================================
  // FRONTEND UI
  // ======================================

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <h1>🎨 AI Comic Generator</h1>

        <p>
          Turn your imagination into amazing comics!
        </p>
      </header>

      {/* MAIN CONTENT */}
      <main className="container">

        <h2>Create Your Comic</h2>

        {/* STORY INPUT */}
        <label>Enter Your Story</label>

        <textarea
          placeholder="Example: A robot wakes up in a factory. It meets a technician and smiles."
          value={story}
          onChange={(e) => setStory(e.target.value)}
        />

        {/* STYLE SELECTOR */}
        <label>Choose Comic Style</label>

        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          <option value="Manga">Manga</option>

          <option value="Western Comic">
            Western Comic
          </option>

          <option value="Minimalist">
            Minimalist
          </option>

          <option value="Watercolor">
            Watercolor
          </option>

          <option value="Pixel Art">
            Pixel Art
          </option>
        </select>

        {/* PANEL SELECTOR */}
        <label>Number of Panels</label>

        <select
          value={panels}
          onChange={(e) => setPanels(e.target.value)}
        >
          <option value="4">4 Panels</option>
          <option value="5">5 Panels</option>
          <option value="6">6 Panels</option>
          <option value="8">8 Panels</option>
        </select>

        {/* GENERATE STORYBOARD BUTTON */}
        <button
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading
            ? "⏳ Generating Storyboard..."
            : "✨ Generate Comic"}
        </button>

        {/* COMIC PREVIEW */}
        {showPreview && (

          <div
            className="preview"
            ref={comicRef}
          >

            <h2>🎨 Your AI Comic Storyboard</h2>

            <p>Style: {style}</p>

            <p>
              Panels: {comicPanels.length}
            </p>

            {/* GENERATE IMAGES BUTTON */}
            <button
              onClick={generateImages}
              disabled={generatingImages}
            >
              {generatingImages
                ? "🎨 Generating Images..."
                : "🖼️ Generate AI Images"}
            </button>

            {/* DOWNLOAD PNG BUTTON */}
            <button
              onClick={downloadComic}
              className="download-button"
            >
              📥 Download Comic PNG
            </button>

            {/* DOWNLOAD PDF BUTTON */}
            <button
              onClick={downloadPDF}
              className="download-button"
            >
              📄 Download Comic PDF
            </button>

            {/* COMIC GRID */}
            <div className="comic-grid">

              {comicPanels.map((panel) => (

                <div
                  className="comic-panel"
                  key={panel.panel_number}
                >

                  {/* PANEL TITLE */}
                  <h3>
                    Panel {panel.panel_number}
                  </h3>

                  {/* IMAGE AND SPEECH BUBBLE */}
                  <div className="comic-image">

                    {/* COMIC IMAGE */}
                    {panel.imageUrl ? (

                      <img
                        src={panel.imageUrl}
                        alt={`Comic Panel ${panel.panel_number}`}
                        crossOrigin="anonymous"
                      />

                    ) : (

                      <div className="image-placeholder">
                        🖼️ Image will appear here
                      </div>

                    )}

                    {/* SPEECH BUBBLE */}
                    {panel.dialogue &&
                      panel.dialogue.trim() !== "" && (

                        <div
                          className={`speech-bubble bubble-${panel.panel_number}`}
                        >
                          {panel.dialogue}
                        </div>

                      )}

                  </div>

                  {/* VISUAL DESCRIPTION */}
                  <div className="caption">
                    {panel.visual_description}
                  </div>

                  {/* NARRATION */}
                  {panel.narration &&
                    panel.narration.trim() !== "" && (

                      <p className="narration">
                        {panel.narration}
                      </p>

                    )}

                </div>

              ))}

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default App;