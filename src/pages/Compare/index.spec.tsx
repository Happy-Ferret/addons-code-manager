import * as React from 'react';
import { Store } from 'redux';
import { History } from 'history';

import {
  createFakeHistory,
  createFakeThunk,
  fakeExternalDiff,
  fakeVersion,
  shallowUntilTarget,
  spyOn,
} from '../../test-helpers';
import configureStore from '../../configureStore';
import {
  actions as versionActions,
  createInternalVersion,
} from '../../reducers/versions';
import FileTree from '../../components/FileTree';
import DiffView from '../../components/DiffView';
import Loading from '../../components/Loading';

import Compare, { CompareBase, PublicProps } from '.';

describe(__filename, () => {
  const createFakeRouteComponentProps = ({
    history = createFakeHistory(),
    params = {
      addonId: '999',
      baseVersionId: '1',
      headVersionId: '2',
      lang: 'fr',
    },
  } = {}) => {
    return {
      history,
      location: history.location,
      match: {
        params,
        isExact: true,
        path: '/some-path',
        url: '/some-url',
      },
    };
  };

  type RenderParams = {
    _fetchDiff?: PublicProps['_fetchDiff'];
    addonId?: string;
    baseVersionId?: string;
    headVersionId?: string;
    history?: History;
    lang?: string;
    store?: Store;
  };

  const render = ({
    _fetchDiff,
    addonId = '999',
    baseVersionId = '1',
    headVersionId = '2',
    history = createFakeHistory(),
    lang = 'fr',
    store = configureStore(),
  }: RenderParams = {}) => {
    const props = {
      ...createFakeRouteComponentProps({
        history,
        params: { lang, addonId, baseVersionId, headVersionId },
      }),
      _fetchDiff,
    };

    return shallowUntilTarget(<Compare {...props} />, CompareBase, {
      shallowOptions: {
        context: { store },
      },
    });
  };

  type GetRouteParamsParams = {
    addonId?: number;
    baseVersionId?: number;
    headVersionId?: number;
  };

  const getRouteParams = ({
    addonId = 9999,
    baseVersionId = 1,
    headVersionId = 1000,
  }: GetRouteParamsParams) => {
    return {
      addonId: String(addonId),
      baseVersionId: String(baseVersionId),
      headVersionId: String(headVersionId),
    };
  };

  const createVersionWithDiff = ({ id = 123 }) => {
    return {
      ...fakeVersion,
      id,
      file: {
        ...fakeVersion.file,
        diff: [fakeExternalDiff],
      },
    };
  };

  it('renders a page with a loading message', () => {
    const root = render();

    expect(root.find(Loading)).toHaveLength(1);
    expect(root.find(Loading)).toHaveProp('message', 'Loading version...');
  });

  it('renders a FileTree component when a version has been loaded', () => {
    const addonId = 9999;
    const baseVersionId = 1;
    const version = createVersionWithDiff({ id: baseVersionId + 1 });

    const store = configureStore();
    store.dispatch(
      versionActions.loadDiff({
        addonId,
        baseVersionId,
        headVersionId: version.id,
        version,
      }),
    );

    const root = render({
      store,
      baseVersionId: String(baseVersionId),
      headVersionId: String(version.id),
    });

    expect(root.find(FileTree)).toHaveLength(1);
    expect(root.find(FileTree)).toHaveProp(
      'version',
      createInternalVersion(version),
    );
  });

  it('renders a DiffView', () => {
    const addonId = 9999;
    const baseVersionId = 1;
    const version = createVersionWithDiff({ id: baseVersionId + 1 });

    const store = configureStore();
    store.dispatch(
      versionActions.loadDiff({
        addonId,
        baseVersionId,
        headVersionId: version.id,
        version,
      }),
    );

    const root = render({
      store,
      baseVersionId: String(baseVersionId),
      headVersionId: String(version.id),
    });

    expect(root.find(DiffView)).toHaveLength(1);
  });

  it('dispatches fetchDiff() on mount', () => {
    const addonId = 9999;
    const baseVersionId = 1;
    const headVersionId = baseVersionId + 1;

    const store = configureStore();
    const dispatch = spyOn(store, 'dispatch');
    const fakeThunk = createFakeThunk();
    const _fetchDiff = fakeThunk.createThunk;

    render({
      ...getRouteParams({ addonId, baseVersionId, headVersionId }),
      _fetchDiff,
      store,
    });

    expect(dispatch).toHaveBeenCalledWith(fakeThunk.thunk);
    expect(_fetchDiff).toHaveBeenCalledWith({
      addonId,
      baseVersionId,
      headVersionId,
    });
  });

  it('redirects to a new compare url when the "old" version is newer than the "new" version', () => {
    const addonId = 123456;
    const baseVersionId = 2;
    const headVersionId = baseVersionId - 1;
    const lang = 'es';

    const store = configureStore();
    const dispatch = spyOn(store, 'dispatch');
    const fakeThunk = createFakeThunk();
    const _fetchDiff = fakeThunk.createThunk;
    const history = createFakeHistory();
    const push = spyOn(history, 'push');

    render({
      ...getRouteParams({ addonId, baseVersionId, headVersionId }),
      _fetchDiff,
      history,
      lang,
      store,
    });

    expect(push).toHaveBeenCalledWith(
      `/${lang}/compare/${addonId}/versions/${headVersionId}...${baseVersionId}/`,
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch fetchDiff() on update if no parameter has changed', () => {
    const addonId = 123456;
    const baseVersionId = 1;
    const headVersionId = baseVersionId + 1;
    const params = getRouteParams({ addonId, baseVersionId, headVersionId });

    const store = configureStore();
    const fakeThunk = createFakeThunk();
    const dispatch = spyOn(store, 'dispatch');

    const root = render({
      ...params,
      _fetchDiff: fakeThunk.createThunk,
      store,
    });

    dispatch.mockClear();
    root.setProps({ match: { params } });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches fetchDiff() on update if base version is different', () => {
    const addonId = 123456;
    const baseVersionId = 10;
    const headVersionId = baseVersionId + 1;

    const store = configureStore();
    const fakeThunk = createFakeThunk();
    const _fetchDiff = fakeThunk.createThunk;
    const dispatch = spyOn(store, 'dispatch');

    const root = render({
      ...getRouteParams({
        addonId,
        baseVersionId: baseVersionId - 1,
        headVersionId,
      }),
      _fetchDiff,
      store,
    });

    dispatch.mockClear();
    _fetchDiff.mockClear();
    root.setProps({
      match: {
        params: getRouteParams({ addonId, baseVersionId, headVersionId }),
      },
    });

    expect(dispatch).toHaveBeenCalledWith(fakeThunk.thunk);
    expect(_fetchDiff).toHaveBeenCalledWith({
      addonId,
      baseVersionId,
      headVersionId,
    });
  });

  it('dispatches fetchDiff() on update if head version is different', () => {
    const addonId = 123456;
    const baseVersionId = 1;
    const headVersionId = baseVersionId + 1;

    const store = configureStore();
    const fakeThunk = createFakeThunk();
    const _fetchDiff = fakeThunk.createThunk;
    const dispatch = spyOn(store, 'dispatch');

    const root = render({
      ...getRouteParams({
        addonId,
        baseVersionId,
        headVersionId: headVersionId + 1,
      }),
      _fetchDiff,
      store,
    });

    dispatch.mockClear();
    _fetchDiff.mockClear();
    root.setProps({
      match: {
        params: getRouteParams({ addonId, baseVersionId, headVersionId }),
      },
    });

    expect(dispatch).toHaveBeenCalledWith(fakeThunk.thunk);
    expect(_fetchDiff).toHaveBeenCalledWith({
      addonId,
      baseVersionId,
      headVersionId,
    });
  });

  it('dispatches fetchDiff() on update if addon ID is different', () => {
    const addonId = 123456;
    const baseVersionId = 1;
    const headVersionId = baseVersionId + 1;

    const store = configureStore();
    const fakeThunk = createFakeThunk();
    const _fetchDiff = fakeThunk.createThunk;
    const dispatch = spyOn(store, 'dispatch');

    const root = render({
      _fetchDiff,
      ...getRouteParams({
        addonId: addonId + 10,
      }),
      store,
    });

    dispatch.mockClear();
    _fetchDiff.mockClear();
    root.setProps({
      match: {
        params: getRouteParams({ addonId, baseVersionId, headVersionId }),
      },
    });

    expect(dispatch).toHaveBeenCalledWith(fakeThunk.thunk);
    expect(_fetchDiff).toHaveBeenCalledWith({
      addonId,
      baseVersionId,
      headVersionId,
    });
  });
});
