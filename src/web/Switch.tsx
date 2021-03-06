import React, {useEffect} from 'react'
import {Buttons} from './buttons/Buttons'
import './Switch.css'

export const Switch = () => {
    const [side, setSide] = React.useState('CLIENT')

    useEffect(() => {
        window.namagomiAPI.checkUpdate(side)
    }, [side])

    return (
        <div className="container">
            <div className="side-radio">
                <input type={'radio'} name={'side'} onClick={() => setSide('CLIENT')}
                       defaultChecked/><label>CLIENT</label>
                <input type={'radio'} name={'side'} onClick={() => setSide('SERVER')}/><label>SERVER</label>
            </div>
            <Buttons side={side}/>
        </div>
    )
}