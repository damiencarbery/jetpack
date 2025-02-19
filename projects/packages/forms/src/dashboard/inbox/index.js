/**
 * External dependencies
 */
import {
	TabPanel,
	Button,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalHStack as HStack,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { createInterpolateElement, useCallback, useEffect, useState } from '@wordpress/element';
import { __, _x } from '@wordpress/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
/**
 * Internal dependencies
 */
import { config } from '../';
import Layout from '../components/layout';
import InboxView from './dataviews';
import ExportModal from './export-modal';
/**
 * Style dependencies
 */
import './style.scss';

const TABS = [
	{
		name: 'inbox',
		title: __( 'Inbox', 'jetpack-forms' ),
		className: 'jp-forms__inbox-tab-item',
	},
	{
		name: 'spam',
		title: __( 'Spam', 'jetpack-forms' ),
		className: 'jp-forms__inbox-tab-item',
	},
	{
		name: 'trash',
		title: _x( 'Trash', 'noun', 'jetpack-forms' ),
		className: 'jp-forms__inbox-tab-item',
	},
];

const Inbox = () => {
	const [ searchParams, setSearchParams ] = useSearchParams();
	const urlStatus = searchParams.get( 'status' );
	const [ showExportModal, setShowExportModal ] = useState( false );
	const navigate = useNavigate();

	const userCanExport = useSelect(
		select => select( coreStore ).canUser( 'update', 'settings' ),
		[]
	);

	// If a user has no responses yet, redirect them to the landing page.
	useEffect( () => {
		if ( config( 'hasFeedback' ) ) {
			return;
		}
		navigate( '/landing' );
	}, [ navigate ] );

	const toggleExportModal = useCallback(
		() => setShowExportModal( ! showExportModal ),
		[ showExportModal, setShowExportModal ]
	);

	const title = <span className="title">{ __( 'Responses', 'jetpack-forms' ) }</span>;

	const subtitle = (
		<span className="subtitle">
			{ createInterpolateElement(
				__( 'Collect and manage responses from your audience. <a>Learn more</a>', 'jetpack-forms' ),
				{
					a: (
						<a
							href="https://jetpack.com/support/jetpack-blocks/contact-form/"
							rel="noreferrer noopener"
							target="_blank"
						/>
					),
				}
			) }
		</span>
	);

	const onTabSelect = useCallback(
		newStatusValue => {
			setSearchParams( previouSearchParams => {
				const _serachParams = new URLSearchParams( previouSearchParams );
				_serachParams.set( 'status', newStatusValue );
				return _serachParams;
			} );
		},
		[ setSearchParams ]
	);
	// TODO: check `Layout` component to refactor or remove.. For now I copied
	// the title and subtitle html..
	return (
		<Layout className="jp-forms__inbox">
			<div className="jp-forms__layout-header">
				<HStack justify="space-between">
					<h2 className="jp-forms__layout-title">{ title }</h2>
					{ userCanExport && (
						<Button className="export-button" variant="primary" onClick={ toggleExportModal }>
							{ __( 'Export', 'jetpack-forms' ) }
						</Button>
					) }
				</HStack>
				<p className="jp-forms__header-subtext">{ subtitle }</p>
			</div>
			<TabPanel
				className="jp-forms__inbox-tabs"
				activeClass="active-tab"
				initialTabName={ [ 'inbox', 'spam', 'trash' ].includes( urlStatus ) ? urlStatus : 'inbox' }
				onSelect={ onTabSelect }
				tabs={ TABS }
			>
				{ () => <InboxView /> }
			</TabPanel>
			<ExportModal isVisible={ showExportModal } onClose={ toggleExportModal } />
		</Layout>
	);
};

export default Inbox;
