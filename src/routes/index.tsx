import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import Home from "./Home";
import Redirect from "./Redirect";

const Routes: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route exact path="/redirect" component={Redirect} />
      </Switch>
    </Router>
  );
};

export default Routes;
