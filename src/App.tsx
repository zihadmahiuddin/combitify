import React, { useState } from "react";
import { createMuiTheme } from "@material-ui/core/styles";

import GlobalStyles from "./GlobalStyles";
import Routes from "./routes";
import ThemeContext from "./ThemeContext";

type PaletteType = "dark" | "light";

function App() {
  let palette = localStorage.getItem("theme");
  if (!palette) {
    palette = "dark";
    localStorage.setItem("theme", palette);
  }
  const [paletteType, setPaletteType] = useState<PaletteType>(
    palette === "light" ? "light" : "dark"
  );

  const theme = createMuiTheme({
    palette: {
      type: paletteType,
    },
  });

  if (theme.palette.type === "light") {
    theme.palette.primary.contrastText = "#000";
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => {
          const newPaletteType = paletteType === "dark" ? "light" : "dark";
          localStorage.setItem("theme", newPaletteType);
          setPaletteType(newPaletteType);
        },
      }}
    >
      <GlobalStyles theme={theme} />
      <Routes />
    </ThemeContext.Provider>
  );
}

export default App;
