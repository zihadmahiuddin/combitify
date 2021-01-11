import React, { Component } from "react";

import SpotifyWebApi from "spotify-web-api-node";

import {
  Avatar,
  Backdrop,
  Button,
  Checkbox,
  CircularProgress,
  Link,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  ListItemAvatar,
  Typography,
} from "@material-ui/core";

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

export default class Home extends Component<{}, HomeState> {
  state: HomeState = {
    checkedPlaylists: [],
    loading: false,
    playlistCount: 0,
    playlists: [],
  };

  accessToken: string;
  expiresAt: number;

  constructor(props: {}) {
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
      trackIds.push(...tracks.map((x) => x.track?.uri));
    }
    trackIds = Array.from(new Set(trackIds.filter((x) => !!x)));
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
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              {username ? <p>Logged in as {username}</p> : <></>}
              <p>Select playlists that you want to combine:</p>
              <p>
                {checkedPlaylists.length}{" "}
                {checkedPlaylists.length === 1 ? "playlist" : "playlists"}{" "}
                selected
              </p>
            </div>
            <div>
              <Button
                onClick={() => {
                  this.setState({
                    checkedPlaylists:
                      checkedPlaylists.length === playlists.length
                        ? []
                        : playlists.map((x) => x.id),
                  });
                }}
              >
                {checkedPlaylists.length === playlists.length
                  ? "Deselect"
                  : "Select"}{" "}
                All
              </Button>
              <Button onClick={this.createPlaylist.bind(this)}>
                Create Playlist
              </Button>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
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
                  <ListItem
                    button
                    component={Link}
                    target="_blank"
                    rel="noreferrer"
                    href={playlist.url}
                    key={playlist.id}
                  >
                    <ListItemAvatar>
                      <Avatar
                        alt={`Avatar ${playlist.id}`}
                        src={playlist.imageUrl}
                      />
                    </ListItemAvatar>
                    <ListItemText id={labelId} primary={playlist.name} />
                    <ListItemSecondaryAction>
                      <Checkbox
                        edge="end"
                        onChange={this.handlePlaylistCheck.bind(
                          this,
                          playlist.id
                        )}
                        checked={checkedPlaylists.indexOf(playlist.id) !== -1}
                        inputProps={{ "aria-labelledby": labelId }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
            {playlists.length < playlistCount ? (
              <Button onClick={this.loadPlaylists}>Load More</Button>
            ) : (
              <></>
            )}
          </div>
        </>
      );
    }
  }
}
