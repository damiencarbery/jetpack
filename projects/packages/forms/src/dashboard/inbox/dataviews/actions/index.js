// import { store as coreStore } from '@wordpress/core-data';
import { AntiSpamIcon } from '@automattic/jetpack-components';
import { __ } from '@wordpress/i18n';
import { seen, thumbsDown, thumbsUp, trash } from '@wordpress/icons';
import { STORE_NAME } from '../../../state';
import { ACTIONS } from '../../constants';
import InboxResponse from '../../response';

// TODO: check if split actions to files or put this one top level..
export const viewAction = {
	id: 'view-response',
	label: __( 'View response', 'jetpack-forms' ),
	isPrimary: true,
	icon: seen,
	RenderModal: ( { items } ) => {
		const [ item ] = items;
		return <InboxResponse isLoading={ false } response={ item } />;
	},
};

export const markAsSpamAction = {
	id: 'mark-as-spam',
	label: __( 'Mark as spam', 'jetpack-forms' ),
	isEligible: item => item.status !== 'spam',
	supportsBulk: true,
	icon: thumbsDown,
	async callback( items, { registry } ) {
		const itemIds = items.map( ( { id } ) => id );
		try {
			// TODO: check if we need to bulk all actions through the Endpoint or not.
			// Some endpoints have also some filters to Akismet..
			await registry.dispatch( STORE_NAME ).doBulkAction( itemIds, ACTIONS.markAsSpam );
		} catch {}
	},
};

// TODO: handle 'busy' state for actions to avoid multiple clicks.
export const markAsNotSpamAction = {
	id: 'mark-as-not-spam',
	label: __( 'Not spam', 'jetpack-forms' ),
	isEligible: item => item.status === 'spam',
	supportsBulk: true,
	icon: thumbsUp,
	async callback( items, { registry } ) {
		const itemIds = items.map( ( { id } ) => id );
		try {
			await registry.dispatch( STORE_NAME ).doBulkAction( itemIds, ACTIONS.markAsNotSpam );
		} catch {}
	},
};

export const checkForSpamAction = {
	id: 'check-for-spam',
	label: __( 'Check for spam', 'jetpack-forms' ),
	isEligible: item => [ 'draft', 'publish' ].includes( item.status ),
	supportsBulk: true,
	icon: AntiSpamIcon,
	RenderModal: () => {
		// TODO: why this happens with ajax (`checkForSpam` function) and not with REST API?
		// Investigate how to do this better?
		return <p>This does not work right now..</p>;
	},
};

export const moveToTrashAction = {
	id: 'move-to-trash',
	label: __( 'Move to trash', 'jetpack-forms' ),
	isEligible: item => item.status !== 'trash',
	supportsBulk: true,
	icon: trash,
	async callback( items, { registry } ) {
		const itemIds = items.map( ( { id } ) => id );
		try {
			await registry.dispatch( STORE_NAME ).doBulkAction( itemIds, ACTIONS.moveToTrash );
		} catch {}
	},
};

export const deleteAction = {
	id: 'delete',
	label: __( 'Delete Permanently', 'jetpack-forms' ),
	isEligible: item => item.status === 'trash',
	supportsBulk: true,
	icon: trash,
	async callback( items, { registry } ) {
		const itemIds = items.map( ( { id } ) => id );
		try {
			await registry.dispatch( STORE_NAME ).doBulkAction( itemIds, ACTIONS.delete );
		} catch {}
	},
};
