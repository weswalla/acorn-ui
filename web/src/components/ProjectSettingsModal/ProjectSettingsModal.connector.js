import { connect } from 'react-redux'
import './ProjectSettingsModal.scss'
import { updateProjectMeta } from '../../redux/persistent/projects/project-meta/actions'
import ProjectSettingsModal from './ProjectSettingsModal.component'
import ProjectsZomeApi from '../../api/projectsApi'
import { getAppWs } from '../../hcWebsockets'
import { cellIdFromString } from '../../utils'

function mapStateToProps(_state) {
  // props for the componen
  return {}
}

function mapDispatchToProps(dispatch) {
  // props for the component
  return {
    updateProjectMeta: async (entry, headerHash, cellIdString) => {
      const appWebsocket = await getAppWs()
      const projectsZomeApi = new ProjectsZomeApi(appWebsocket)
      const cellId = cellIdFromString(cellIdString)
      // @ts-ignore
      const updatedProjectMeta = await projectsZomeApi.projectMeta.update(cellId, { entry, headerHash })
      return dispatch(
        updateProjectMeta(cellIdString, updatedProjectMeta)
      )
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProjectSettingsModal)