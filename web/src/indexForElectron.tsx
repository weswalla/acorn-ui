import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { createStore, applyMiddleware, compose } from 'redux'
import { AppClient, CellType } from '@holochain/client'

// Local Imports
import { PROFILES_ROLE_NAME, PROJECTS_ROLE_NAME } from './holochainConfig'
import acorn from './redux/reducer'
import signalsHandlers from './signalsHandlers'
import {
  setProfilesCellId,
  setProjectsCellIds,
} from './redux/persistent/cells/actions'
import { layoutWatcher } from './redux/ephemeral/layout/middleware'
import { realtimeInfoWatcher } from './redux/persistent/projects/realtime-info-signal/middleware'
import { fetchAgents } from './redux/persistent/profiles/agents/actions'
import { whoami } from './redux/persistent/profiles/who-am-i/actions'
import { fetchAgentAddress } from './redux/persistent/profiles/agent-address/actions'
import App from './routes/App.connector'
import { setAgentPubKey } from './hcWebsockets'
import { getProjectCellIdStrings } from './projectAppIds'
import ProfilesZomeApi from './api/profilesApi'
import { cellIdToString } from './utils'

// Import styles
import './variables.scss'
import './global.scss'

export default async function createStoreAndRenderToDom(appWs: AppClient) {
  const middleware = [layoutWatcher, realtimeInfoWatcher(appWs)]
  // This enables the redux-devtools browser extension
  // which gives really awesome debugging for apps that use redux
  const composeEnhancers =
    // @ts-ignore
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
  // acorn is the top-level reducer. the second argument is custom Holochain middleware
  let store = createStore(
    acorn,
    /* preloadedState, */ composeEnhancers(applyMiddleware(...middleware))
  )
  // connect the signal handler to the app websocket
  appWs.on('signal', signalsHandlers(store))

  // By passing the `store` in as a wrapper around our React component
  // we make the state available throughout it
  ReactDOM.render(
    <Provider store={store}>
      <App appWebsocket={appWs} />
    </Provider>,
    document.getElementById('react')
  )

  return store
}

export async function electronInit(store: any, appWs: AppClient) {
  try {
    console.log('indexing electron A', {
      appWs,
    })
    const appInfo = await appWs.appInfo()
    console.log('indexing electron A', {
      appWs,
      appInfo,
    })
    const { profilesCellInfo, projectsCellInfo } = {
      profilesCellInfo: appInfo?.cell_info[PROFILES_ROLE_NAME][0],
      projectsCellInfo: appInfo?.cell_info[PROJECTS_ROLE_NAME][0],
    }
    const { cellId, projectsCellId } = {
      cellId:
        profilesCellInfo && CellType.Provisioned in profilesCellInfo
          ? profilesCellInfo[CellType.Provisioned].cell_id
          : undefined,
      projectsCellId:
        projectsCellInfo && CellType.Provisioned in projectsCellInfo
          ? projectsCellInfo[CellType.Provisioned].cell_id
          : undefined,
    }
    if (cellId == undefined || projectsCellId == undefined) {
      throw 'cellId undefined'
    } else {
      const [_dnaHash, agentPubKey] = cellId
      // cache buffer version of agentPubKey
      setAgentPubKey(agentPubKey)
      const cellIdString = cellIdToString(cellId)
      store.dispatch(setProfilesCellId(cellIdString))
      // all functions of the Profiles DNA
      const profilesZomeApi = new ProfilesZomeApi(appWs)
      console.log('indexing electron B', {
        appWs,
      })

      const profiles = await profilesZomeApi.profile.fetchAgents(cellId)
      console.log('indexing electron 0', {
        cellIdString,
        profiles,
      })
      store.dispatch(fetchAgents(cellIdString, profiles))
      const profile = await profilesZomeApi.profile.whoami(cellId)
      // this allows us to 'reclaim' a profile that was imported by someone else that is ours
      // (i.e. it relates to our public key)
      if (profile) {
        let nonImportedProfile = {
          ...profile.entry,
          isImported: false,
        }
        await profilesZomeApi.profile.updateWhoami(cellId, {
          entry: nonImportedProfile,
          actionHash: profile.actionHash,
        })
        profile.entry = nonImportedProfile
      }
      store.dispatch(whoami(cellIdString, profile))
      const agentAddress = await profilesZomeApi.profile.fetchAgentAddress(
        cellId
      )
      store.dispatch(fetchAgentAddress(cellIdString, agentAddress))
      // which projects do we have installed?
      console.log('indexing electron 1', {
        cellIdString,
        profiles,
        profile,
        agentAddress,
      })
      const projectCellIds = await getProjectCellIdStrings()

      store.dispatch(setProjectsCellIds(projectCellIds))
    }
  } catch (e) {
    console.error(e)
  }
}
