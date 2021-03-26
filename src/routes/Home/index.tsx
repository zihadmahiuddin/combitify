import React, { Component } from "react";

import SpotifyWebApi from "spotify-web-api-node";

import {
  Avatar,
  Backdrop,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  ListItemAvatar,
  Typography,
  Divider,
  AppBar,
  Toolbar,
} from "@material-ui/core";
import {
  Add,
  Brightness4,
  Brightness7,
  CheckBox,
  CheckBoxOutlineBlank,
} from "@material-ui/icons";

import ThemeContext from "../../ThemeContext";

import { createStyles, withStyles, WithStyles } from "@material-ui/core/styles";

const styles = () => {
  return createStyles({
    divider: {},
  });
};

const clientId = "e8685ee9a7b8473e84cf929a61533b85",
  scopes = ["playlist-read-private", "playlist-modify-private"],
  redirectUri = `${window.location.origin}/redirect`;

const spotifyApi = new SpotifyWebApi({
  clientId,
  redirectUri,
});

const authorizeUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes.join(
  "%20"
)}`;

type PlaylistRow = {
  description: string | null;
  id: string;
  name: string;
  url: string;
  tracks: number;
  imageUrl: string;
};

type HomeState = {
  checkedPlaylists: string[];
  loading: boolean;
  loadingText?: string;
  playlistCount: number;
  playlists: PlaylistRow[];
  userId?: string;
  username?: string;
};

interface Props extends WithStyles<typeof styles> {}

class Home extends Component<Props, HomeState> {
  state: HomeState = {
    checkedPlaylists: [],
    loading: false,
    playlistCount: 0,
    playlists: [],
  };

  accessToken: string;
  expiresAt: number;

  constructor(props: Props) {
    super(props);

    this.accessToken = window.localStorage.getItem("accessToken") || "";
    const expiresAtString = window.localStorage
      .getItem("expiresAt")
      ?.toString();
    this.expiresAt = parseInt(expiresAtString || "");
  }

  async componentDidMount() {
    if (
      this.accessToken &&
      !isNaN(this.expiresAt) &&
      this.expiresAt > Date.now()
    ) {
      spotifyApi.setAccessToken(this.accessToken);
      this.setState({ loading: true });
      const meResponse = await spotifyApi.getMe();
      if (meResponse.statusCode >= 200 && meResponse.statusCode < 300) {
        this.setState({
          userId: meResponse.body.id,
          username: meResponse.body.display_name || "",
        });
      }
      await this.loadPlaylists();
    }
  }

  loadPlaylists = async () => {
    this.setState({ loading: true });
    const playlistsResponse = await spotifyApi.getUserPlaylists({
      limit: 20,
      offset: this.state.playlists.length,
    });
    this.setState((state) => {
      return {
        loading: false,
        playlistCount: playlistsResponse.body.total,
        playlists: [
          ...state.playlists,
          ...playlistsResponse.body.items.map((x) => {
            return {
              description: x.description,
              id: x.id,
              name: x.name,
              url: x.external_urls.spotify,
              tracks: x.tracks.total,
              imageUrl: x.images[0]?.url,
            };
          }),
        ],
      };
    });
  };

  handlePlaylistCheck(playlistId: string) {
    this.setState((state) => {
      const currentIndex = state.checkedPlaylists.indexOf(playlistId);
      const newChecked = [...state.checkedPlaylists];

      if (currentIndex === -1) {
        newChecked.push(playlistId);
      } else {
        newChecked.splice(currentIndex, 1);
      }
      return {
        checkedPlaylists: newChecked,
      };
    });
  }

  async createPlaylist() {
    let trackIds: string[] = [];
    for (const checkedPlaylist of this.state.playlists.filter((x) =>
      this.state.checkedPlaylists.includes(x.id)
    )) {
      let tracks: any[] = [];
      this.setState({
        loading: true,
        loadingText: `Loading tracks of playlist "${checkedPlaylist.name}" (${checkedPlaylist.id})`,
      });
      while (true) {
        const tracksResponse = await spotifyApi.getPlaylistTracks(
          checkedPlaylist.id,
          { limit: 20, offset: tracks.length }
        );
        tracks.push(...tracksResponse.body.items);
        if (tracks.length >= tracksResponse.body.total) break;
      }
      console.log(
        `Loaded ${tracks.length} tracks from ${checkedPlaylist.name} (${checkedPlaylist.id})`
      );
      trackIds.push(
        ...tracks
          .map((x) => x.track?.uri)
          .filter((x) => x && x.startsWith("spotify:track:"))
      );
    }
    trackIds = Array.from(new Set(trackIds));
    const playlistResponse = await spotifyApi.createPlaylist(
      this.state.userId!!,
      { name: "Combined Playlist", public: false } as any
    );
    if (
      playlistResponse.statusCode >= 200 &&
      playlistResponse.statusCode < 300
    ) {
      for (let i = 0; i < trackIds.length; i += 100) {
        await spotifyApi.addTracksToPlaylist(
          playlistResponse.body.id,
          trackIds.slice(i, i + 100)
        );
      }
      window.open(playlistResponse.body.external_urls.spotify);
    }
    this.setState({
      loading: false,
      loadingText: "",
    });
  }

  render() {
    if (
      !this.accessToken ||
      isNaN(this.expiresAt) ||
      this.expiresAt <= Date.now()
    ) {
      window.location.href = authorizeUrl;
      return <div />;
    } else {
      const {
        checkedPlaylists,
        loading,
        loadingText,
        playlistCount,
        playlists,
        username,
      } = this.state;

      return (
        <ThemeContext.Consumer>
          {({ theme, toggleTheme }) => {
            return (
              <>
                <Backdrop
                  style={{
                    zIndex: 1000,
                    color: "#fff",
                  }}
                  open={loading}
                >
                  <CircularProgress color="inherit" />
                  <br />
                  <Typography>{loadingText}</Typography>
                </Backdrop>
                <AppBar position="static">
                  <Toolbar>
                    <Typography
                      variant="h6"
                      style={{
                        flexGrow: 1,
                      }}
                    >
                      Combitify
                    </Typography>
                    <IconButton
                      onClick={this.createPlaylist.bind(this)}
                      style={{
                        color: theme.palette.primary.contrastText,
                      }}
                      title="Create playlist from selected playlists"
                    >
                      <Add />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        this.setState({
                          checkedPlaylists:
                            checkedPlaylists.length === playlists.length
                              ? []
                              : playlists.map((x) => x.id),
                        });
                      }}
                      style={{
                        color: theme.palette.primary.contrastText,
                      }}
                      title="Select/deselect all playlists"
                    >
                      {checkedPlaylists.length === playlists.length ? (
                        <CheckBox />
                      ) : (
                        <CheckBoxOutlineBlank />
                      )}
                    </IconButton>
                    <IconButton
                      onClick={toggleTheme}
                      style={{
                        color: theme.palette.primary.contrastText,
                      }}
                      title="Toggle dark/light theme"
                    >
                      {theme.palette.type === "dark" ? (
                        <Brightness7 />
                      ) : (
                        <Brightness4 />
                      )}
                    </IconButton>
                  </Toolbar>
                </AppBar>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: theme.palette.primary.contrastText,
                    padding: "1em",
                  }}
                >
                  <div>
                    {username ? <p>Logged in as {username}</p> : <></>}
                    <span>
                      {checkedPlaylists.length}{" "}
                      {checkedPlaylists.length === 1 ? "playlist" : "playlists"}{" "}
                      selected containing total{" "}
                      {playlists
                        .filter((x) => checkedPlaylists.includes(x.id))
                        .reduce((a, b) => a + b.tracks, 0)}{" "}
                      tracks
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    paddingBottom: "1em",
                  }}
                >
                  <List
                    dense
                    style={{
                      width: "100%",
                    }}
                  >
                    {playlists.map((playlist) => {
                      const labelId = `checkbox-list-secondary-label-${playlist.id}`;
                      return (
                        <React.Fragment key={playlist.id}>
                          <ListItem
                            button
                            component={Link}
                            target="_blank"
                            rel="noreferrer"
                            href={playlist.url}
                            style={{
                              margin: "0.25em 0",
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar
                                alt={`Avatar ${playlist.id}`}
                                src={playlist.imageUrl}
                              />
                            </ListItemAvatar>
                            <ListItemText
                              style={{
                                color: theme.palette.primary.contrastText,
                              }}
                              primaryTypographyProps={{
                                style: {
                                  fontWeight: 200,
                                  fontSize: 16,
                                },
                              }}
                              id={labelId}
                              primary={playlist.name}
                            />
                            <ListItemSecondaryAction
                              style={{
                                padding: "0 0.5em",
                              }}
                            >
                              <Checkbox
                                edge="end"
                                onChange={this.handlePlaylistCheck.bind(
                                  this,
                                  playlist.id
                                )}
                                checked={
                                  checkedPlaylists.indexOf(playlist.id) !== -1
                                }
                                inputProps={{
                                  "aria-labelledby": labelId,
                                }}
                              />
                            </ListItemSecondaryAction>
                          </ListItem>
                          <Divider
                            style={{
                              marginLeft: 48,
                              marginRight: 48,
                            }}
                            variant="middle"
                            component="li"
                          />
                        </React.Fragment>
                      );
                    })}
                  </List>
                  {playlists.length < playlistCount ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={this.loadPlaylists}
                    >
                      Load More
                    </Button>
                  ) : (
                    <></>
                  )}
                  <Typography
                    style={{
                      color: theme.palette.primary.contrastText,
                      marginTop: "1em",
                    }}
                  >
                    {"Made with <3 by Zihad. Special thanks to Jerick :)"}
                  </Typography>
                </div>
              </>
            );
          }}
        </ThemeContext.Consumer>
      );
    }
  }
}

export default withStyles(styles, { withTheme: true })(Home);
