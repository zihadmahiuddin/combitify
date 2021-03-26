import { createGlobalStyle } from "styled-components";
import { Theme } from "@material-ui/core";

type GlobalStyleProps = {
  theme: Theme;
};

const GlobalStyle = createGlobalStyle<GlobalStyleProps>`
  body {
    background-color: ${(props: GlobalStyleProps) =>
      props.theme.palette.background.paper};
  }
`;

export default GlobalStyle;
