import { createMuiTheme } from "@material-ui/core/styles";
import { createContext } from "react";

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
  },
});

const ThemeContext = createContext({
  theme: darkTheme,
  toggleTheme: () => {},
});

export default ThemeContext;
