import * as React from 'react';
import { Col, Row } from 'react-bootstrap';
import { RouteComponentProps } from 'react-router-dom';
import { connect } from 'react-redux';

import { ApplicationState, ConnectedReduxProps } from '../../configureStore';
import FileTree from '../../components/FileTree';
import DiffView from '../../components/DiffView';
import Loading from '../../components/Loading';
import VersionChooser from '../../components/VersionChooser';
import {
  CompareInfoMap,
  Version,
  actions as versionsActions,
  fetchDiff,
  getCompareInfoMap,
  getVersionInfo,
} from '../../reducers/versions';
import { gettext } from '../../utils';

export type PublicProps = {
  _fetchDiff: typeof fetchDiff;
};

type PropsFromRouter = {
  addonId: string;
  baseVersionId: string;
  headVersionId: string;
  lang: string;
};

type PropsFromState = {
  addonId: number;
  compareInfoMap: CompareInfoMap | null;
  version: Version;
};

type Props = RouteComponentProps<PropsFromRouter> &
  PropsFromState &
  PublicProps &
  ConnectedReduxProps;

export class CompareBase extends React.Component<Props> {
  static defaultProps = {
    _fetchDiff: fetchDiff,
  };

  componentDidMount() {
    const { history, match } = this.props;
    const { lang, addonId, baseVersionId, headVersionId } = match.params;

    const oldVersionId = parseInt(baseVersionId, 10);
    const newVersionId = parseInt(headVersionId, 10);

    // We ensure the new version ID is newer than the old version ID.
    if (oldVersionId > newVersionId) {
      history.push(
        `/${lang}/compare/${addonId}/versions/${headVersionId}...${baseVersionId}/`,
      );
      return;
    }

    this.loadData();
  }

  componentDidUpdate(prevProps: Props) {
    this.loadData(prevProps);
  }

  loadData(prevProps?: Props) {
    const { match } = this.props;
    const { addonId, baseVersionId, headVersionId } = match.params;

    if (
      !prevProps ||
      addonId !== prevProps.match.params.addonId ||
      baseVersionId !== prevProps.match.params.baseVersionId ||
      headVersionId !== prevProps.match.params.headVersionId
    ) {
      const { dispatch, _fetchDiff } = this.props;

      dispatch(
        _fetchDiff({
          addonId: parseInt(addonId, 10),
          baseVersionId: parseInt(baseVersionId, 10),
          headVersionId: parseInt(headVersionId, 10),
        }),
      );
    }
  }

  onSelectFile = (path: string) => {
    const { _fetchDiff, compareInfoMap, dispatch, match } = this.props;
    const { addonId, baseVersionId, headVersionId } = match.params;

    dispatch(
      versionsActions.updateSelectedPath({
        selectedPath: path,
        versionId: parseInt(headVersionId, 10),
      }),
    );

    if (!compareInfoMap || !compareInfoMap[path]) {
      dispatch(
        _fetchDiff({
          addonId: parseInt(addonId, 10),
          baseVersionId: parseInt(baseVersionId, 10),
          headVersionId: parseInt(headVersionId, 10),
          path,
        }),
      );
    }
  };

  render() {
    const { addonId, compareInfoMap, version } = this.props;

    if (!version) {
      return (
        <Col>
          <Loading message={gettext('Loading version...')} />
        </Col>
      );
    }

    const fetchDiffHasFailed = compareInfoMap === null;
    const compareInfo = compareInfoMap && compareInfoMap[version.selectedPath];

    return (
      <React.Fragment>
        <Col md="3">
          <FileTree version={version} onSelect={this.onSelectFile} />
        </Col>
        <Col md="9">
          <Row>
            <Col>
              <VersionChooser addonId={addonId} />
            </Col>
          </Row>
          <Row>
            <Col>
              {fetchDiffHasFailed && <p>ERROR</p>}
              {compareInfo ? (
                <DiffView
                  diffs={compareInfo.diffs}
                  mimeType={compareInfo.mimeType}
                />
              ) : (
                <Loading message={gettext('Loading diff...')} />
              )}
            </Col>
          </Row>
        </Col>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (
  state: ApplicationState,
  ownProps: RouteComponentProps<PropsFromRouter>,
): PropsFromState => {
  const { match } = ownProps;
  const addonId = parseInt(match.params.addonId, 10);
  const baseVersionId = parseInt(match.params.baseVersionId, 10);
  const headVersionId = parseInt(match.params.headVersionId, 10);

  // The Compare API returns the version info of the head/newest version.
  const version = getVersionInfo(state.versions, headVersionId);
  const compareInfoMap = getCompareInfoMap(
    state.versions,
    addonId,
    baseVersionId,
    headVersionId,
  );

  return {
    addonId,
    compareInfoMap,
    version,
  };
};

export default connect(mapStateToProps)(CompareBase);
