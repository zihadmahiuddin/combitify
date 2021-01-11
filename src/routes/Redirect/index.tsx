import React, { FC } from "react";

import { RouteProps } from "react-router";
import { Redirect as RedirectRR } from "react-router-dom";
import queryString from "query-string";

const Redirect: FC = (props: RouteProps) => {
  const parsedHash = queryString.parse(props.location?.hash!!);

  if (parsedHash.access_token && parsedHash.expires_in) {
    localStorage.setItem("accessToken", parsedHash.access_token.toString());
    localStorage.setItem(
      "expiresAt",
      new Date(Date.now() + parseInt(parsedHash.expires_in.toString()) * 1000)
        .getTime()
        .toString()
    );
    return <RedirectRR to="/" />;
  }

  return <p>Failed to authorize. Please try again later.</p>;
};

export default Redirect;
