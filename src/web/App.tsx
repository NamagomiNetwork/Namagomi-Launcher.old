import React from 'react';
import './App.css';
import {AddMods} from "./AddMods";

export const App = () => {
    return (
        <div className="container">
            <Buttons/><br/>
            <AddMods/>
        </div>
    );
};

type State = {
    value: string,
    updateAvailable: boolean,
    manuallyMods: string[]
}

class Buttons extends React.Component<{}, State> {
    constructor(props:{}) {
        super(props);
        this.state = {
            value: '',
            updateAvailable: false,
            manuallyMods: [] as string[]
        };

        this.handleChange = this.handleChange.bind(this);
        this.checkUpdate = this.checkUpdate.bind(this)
        this.showManuallyMods = this.showManuallyMods.bind(this)
    }

    handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({value: event.target.value});
    }

    checkUpdate() {
        window.namagomiAPI.isLatestMods().then(isLatest => {
            this.setState({updateAvailable: !isLatest})
        })
    }

    componentDidMount() {
        this.checkUpdate()
    }

    async showManuallyMods(modids: Promise<string[]>) {
        this.setState({manuallyMods: await modids})
    }

    render() {
        return (
            <div>
                <button onClick={()=>this.showManuallyMods(window.namagomiAPI.downloadAllModFiles())}>DownloadAllModFiles</button>
                <button onClick={window.namagomiAPI.downloadClientModFiles}>DownloadClientModFiles</button>
                <button onClick={window.namagomiAPI.downloadServerModFiles}>DownloadServerModFiles</button>
                <button onClick={window.namagomiAPI.downloadAllConfigFiles}>DownloadAllConfigFile</button>
                <button onClick={window.namagomiAPI.setupNamagomiLauncherProfile}>SetupNamagomiLauncherProfile</button>
                <button onClick={window.namagomiAPI.BuildGitTree}>BuildGitTree</button>
                <button onClick={() => window.namagomiAPI.GetGitFileData(this.state.value)}>GetFileData</button>
                <input type="text" id="filePath" value={this.state.value} onChange={this.handleChange}/>
                <button onClick={window.namagomiAPI.OpenFolder}>OpenFolder</button>
                <button onClick={this.checkUpdate}>updatable: {this.state.updateAvailable?'true':'false'}</button><br/>
                {
                    this.state.manuallyMods.length === 0
                        ? <div></div>
                        : <text>以下のmodは手動でダウンロードしてください</text>
                }<br/>
                {
                    this.state.manuallyMods.map(mod =>
                    <a href={mod} target={"_blank"} rel={"noopener nofollow"}>
                        {mod}<br/>
                    </a>)}
            </div>
        );
    }
}